import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan, EventParticipantStatus, RoleInEvent, EventStatus } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventsController – POST /events/:eventId/participants/me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;

  let user: any;
  let userToken: string;

  let event: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });

    user = await seedUser(prisma, UserPlan.FREE, { firstName: 'Runner' });
    userToken = makeJwtToken(jwtService, user.id, user.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Event RSVP',
        description: null,
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        locationName: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
        eventCode: 'RSVP01',
      },
    });

    await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: organiser.id,
        status: EventParticipantStatus.GOING,
        role: RoleInEvent.ORGANISER,
        eventRouteId: null,
        eventGroupId: null,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).post(`/events/${event.id}/participants/me`).send({ status: 'GOING' }).expect(401);
  });

  it("404 si l'event n'existe pas", async () => {
    const res = await request(app.getHttpServer())
      .post(`/events/event-inexistant-123/participants/me`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'GOING' })
      .expect(404);

    expect(res.body.message).toContain('Event not found');
  });

  it('400 si status invalide (INVITED non autorisé ici)', async () => {
    await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/me`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'INVITED' })
      .expect(400);
  });

  it('200 crée un EventParticipant si absent (GOING)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/me`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'GOING' })
      .expect(200);

    expect(res.body).toHaveProperty('userId', user.id);
    expect(res.body).toHaveProperty('roleInEvent', 'PARTICIPANT');
    expect(res.body).toHaveProperty('status', 'GOING');
    expect(res.body).toHaveProperty('eventRouteId', null);
    expect(res.body).toHaveProperty('eventGroupId', null);

    const rows = await prisma.eventParticipant.findMany({ where: { eventId: event.id, userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(EventParticipantStatus.GOING);
    expect(rows[0].role).toBe(RoleInEvent.PARTICIPANT);
  });

  it('200 met à jour le statut si déjà présent (idempotent, pas de duplication)', async () => {
    // seed INVITED pour simuler un user invité (MVP-3)
    await prisma.eventParticipant.deleteMany({ where: { eventId: event.id, userId: user.id } });
    await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: user.id,
        status: EventParticipantStatus.INVITED,
        role: RoleInEvent.PARTICIPANT,
        eventRouteId: null,
        eventGroupId: null,
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/me`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'DECLINED' })
      .expect(200);

    const rows = await prisma.eventParticipant.findMany({ where: { eventId: event.id, userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(EventParticipantStatus.DECLINED);
  });
});
