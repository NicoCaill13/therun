import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent, UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventParticipantsController – POST /events/:eventId/participants/invite (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;

  let otherUser: any;
  let otherUserToken: string;

  let invitedUser: any;

  let event: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    // Clean
    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);

    invitedUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Invited' });

    event = await prisma.event.create({
      data: {
        title: 'Run du jeudi',
        startDateTime: new Date('2026-01-01T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: `EVT${Date.now().toString().slice(-6)}`,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const postInvite = (token: string, eventId: string, body: any) => {
    return request(app.getHttpServer()).post(`/events/${eventId}/participants/invite`).set('Authorization', `Bearer ${token}`).send(body);
  };

  describe('Auth / Access / Validation', () => {
    it('401 si pas de token', async () => {
      await request(app.getHttpServer())
        .post(`/events/${event.id}/participants/invite`)
        .send({ userId: invitedUser.id, role: 'PARTICIPANT' })
        .expect(401);
    });

    it('404 si eventId inconnu', async () => {
      const res = await postInvite(organiserToken, 'evt-does-not-exist', {
        userId: invitedUser.id,
        role: 'PARTICIPANT',
      }).expect(404);

      expect(res.body.message).toBe('Event not found');
    });

    it("403 si l'utilisateur n'est pas l'organisateur", async () => {
      const res = await postInvite(otherUserToken, event.id, {
        userId: invitedUser.id,
        role: 'PARTICIPANT',
      }).expect(403);

      expect(res.body.message).toBe('Only organiser can invite participants');
    });

    it('400 si payload invalide (role manquant)', async () => {
      const res = await postInvite(organiserToken, event.id, {
        userId: invitedUser.id,
      }).expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.join(' | ')).toContain('role');
    });

    it('400 si payload invalide (role incorrect)', async () => {
      const res = await postInvite(organiserToken, event.id, {
        userId: invitedUser.id,
        role: 'ADMIN',
      }).expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.join(' | ')).toContain('role');
    });

    it('400 si payload invalide (userId manquant)', async () => {
      const res = await postInvite(organiserToken, event.id, {
        role: 'PARTICIPANT',
      }).expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.join(' | ')).toContain('userId');
    });
  });

  describe('Business rules', () => {
    it('404 si userId inconnu', async () => {
      const res = await postInvite(organiserToken, event.id, {
        userId: 'usr-does-not-exist',
        role: 'PARTICIPANT',
      }).expect(404);

      expect(res.body.message).toBe('User not found');
    });

    it("409 si l'organisateur tente de s'inviter lui-même", async () => {
      const res = await postInvite(organiserToken, event.id, {
        userId: organiser.id,
        role: 'PARTICIPANT',
      }).expect(409);

      expect(res.body.message).toBe('Organiser cannot invite himself');
    });

    it('201 si création (nouvel EventParticipant)', async () => {
      const res = await postInvite(organiserToken, event.id, {
        userId: invitedUser.id,
        role: 'PARTICIPANT',
      }).expect(201);

      expect(res.body).toMatchObject({
        eventId: event.id,
        userId: invitedUser.id,
        role: 'PARTICIPANT',
        status: 'INVITED',
      });

      const inDb = await prisma.eventParticipant.findFirst({
        where: { eventId: event.id, userId: invitedUser.id },
      });
      expect(inDb).toBeTruthy();
      expect(inDb?.status).toBe(EventParticipantStatus.INVITED);
      expect(inDb?.role).toBe(RoleInEvent.PARTICIPANT);
    });

    it('200 si update (pas de doublon) + role update + status reset à INVITED', async () => {
      // On force un status différent en DB
      await prisma.eventParticipant.updateMany({
        where: { eventId: event.id, userId: invitedUser.id },
        data: { status: EventParticipantStatus.DECLINED, role: RoleInEvent.PARTICIPANT },
      });

      const beforeCount = await prisma.eventParticipant.count({
        where: { eventId: event.id, userId: invitedUser.id },
      });
      expect(beforeCount).toBe(1);

      const res = await postInvite(organiserToken, event.id, {
        userId: invitedUser.id,
        role: 'ENCADRANT',
      });
      expect(res.body).toMatchObject({
        eventId: event.id,
        userId: invitedUser.id,
        role: 'ENCADRANT',
        status: 'INVITED',
      });

      const afterCount = await prisma.eventParticipant.count({
        where: { eventId: event.id, userId: invitedUser.id },
      });
      expect(afterCount).toBe(1);

      const inDb = await prisma.eventParticipant.findFirst({
        where: { eventId: event.id, userId: invitedUser.id },
      });
      expect(inDb?.status).toBe(EventParticipantStatus.INVITED);
      expect(inDb?.role).toBe(RoleInEvent.ENCADRANT);
    });
  });
});
