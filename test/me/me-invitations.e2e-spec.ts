import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan, EventParticipantStatus, RoleInEvent } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearEventsAndRoutes } from '../e2e-utils';

describe('MeController – GET /me/invitations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;

  let invitedUser: any;
  let invitedUserToken: string;

  let otherUser: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearEventsAndRoutes(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    invitedUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Invited' });
    invitedUserToken = makeJwtToken(jwtService, invitedUser.id, invitedUser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
  });

  afterAll(async () => {
    await app.close();
  });

  const createEvent = async (title: string, startDateTime: Date) => {
    return prisma.event.create({
      data: {
        title,
        startDateTime,
        organiserId: organiser.id,
        eventCode: `EVT${Math.random().toString(16).slice(2, 10)}`,
        locationName: 'Parc Borély',
      },
    });
  };

  const createParticipant = async (params: { eventId: string; userId: string; status: EventParticipantStatus; role?: RoleInEvent }) => {
    return prisma.eventParticipant.create({
      data: {
        eventId: params.eventId,
        userId: params.userId,
        status: params.status,
        role: params.role ?? RoleInEvent.PARTICIPANT,
      },
    });
  };

  describe('Auth / Validation', () => {
    it('401 si pas de token', async () => {
      await request(app.getHttpServer()).get('/me/invitations').expect(401);
    });

    it('400 si page invalide', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/invitations?page=0')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .expect(400);

      expect(res.body.message.join(' | ')).toContain('page');
    });

    it('400 si pageSize invalide (>50)', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/invitations?pageSize=200')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .expect(400);

      expect(res.body.message.join(' | ')).toContain('pageSize');
    });
  });

  describe('Business', () => {
    beforeAll(async () => {
      // event A (plus tôt)
      const e1 = await createEvent('Run A', new Date('2026-01-01T18:00:00.000Z'));
      // event B (plus tard)
      const e2 = await createEvent('Run B', new Date('2026-01-02T18:00:00.000Z'));

      // Invitations pour invitedUser
      await createParticipant({
        eventId: e2.id,
        userId: invitedUser.id,
        status: EventParticipantStatus.INVITED,
        role: RoleInEvent.ENCADRANT,
      });
      await createParticipant({
        eventId: e1.id,
        userId: invitedUser.id,
        status: EventParticipantStatus.INVITED,
        role: RoleInEvent.PARTICIPANT,
      });

      // Non-invited (ne doit pas sortir)
      await createParticipant({
        eventId: e1.id,
        userId: invitedUser.id,
        status: EventParticipantStatus.GOING,
        role: RoleInEvent.PARTICIPANT,
      });

      // Invitations d’un autre user (ne doivent pas sortir)
      await createParticipant({
        eventId: e1.id,
        userId: otherUser.id,
        status: EventParticipantStatus.INVITED,
        role: RoleInEvent.PARTICIPANT,
      });
    });

    it('200 + réponse paginée stable, uniquement status=INVITED pour le user connecté', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/invitations?page=1&pageSize=20')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toMatchObject({
        page: 1,
        pageSize: 20,
      });

      // On doit avoir au moins 2 invitations INVITED (Run A + Run B)
      expect(res.body.totalCount).toBeGreaterThanOrEqual(2);

      for (const it of res.body.items) {
        expect(it.status).toBe('INVITED');
        expect(it).toHaveProperty('participantId');
        expect(it).toHaveProperty('eventId');
        expect(it).toHaveProperty('eventTitle');
        expect(it).toHaveProperty('startDateTime');
        expect(it).toHaveProperty('locationName');
        expect(it).toHaveProperty('organiserId');
        expect(it).toHaveProperty('organiserFirstName');
      }
    });

    it('tri par event.startDateTime ASC (les plus proches d’abord)', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/invitations?page=1&pageSize=20')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .expect(200);

      const titles = res.body.items.map((x: any) => x.eventTitle);

      // Run A (01/01) avant Run B (01/02)
      const idxA = titles.indexOf('Run A');
      const idxB = titles.indexOf('Run B');
      expect(idxA).toBeGreaterThanOrEqual(0);
      expect(idxB).toBeGreaterThanOrEqual(0);
      expect(idxA).toBeLessThan(idxB);
    });

    it('si aucune invitation, retourne items=[] et totalCount=0', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/invitations')
        .set('Authorization', `Bearer ${organiserToken}`) // organiser n’a pas d’invitations
        .expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.totalCount).toBe(0);
      expect(res.body.totalPages).toBe(0);
    });

    it('pagination: page/pageSize découpent correctement', async () => {
      // Ajoute 25 invitations pour invitedUser afin de tester page 2
      const base = new Date('2026-02-01T18:00:00.000Z');
      for (let i = 0; i < 25; i++) {
        const e = await createEvent(`Bulk ${i}`, new Date(base.getTime() + i * 60_000));
        await createParticipant({ eventId: e.id, userId: invitedUser.id, status: EventParticipantStatus.INVITED });
      }

      const r1 = await request(app.getHttpServer())
        .get('/me/invitations?page=1&pageSize=10')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .expect(200);

      const r2 = await request(app.getHttpServer())
        .get('/me/invitations?page=2&pageSize=10')
        .set('Authorization', `Bearer ${invitedUserToken}`)
        .expect(200);

      expect(r1.body.items).toHaveLength(10);
      expect(r2.body.items).toHaveLength(10);

      const ids1 = r1.body.items.map((x: any) => x.participantId);
      const ids2 = r2.body.items.map((x: any) => x.participantId);
      expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
    });
  });
});
