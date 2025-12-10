import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan, EventStatus, EventParticipantStatus, RoleInEvent } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';

describe('EventsController – POST /events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiserFree: any;
  let organiserFreeToken: string;
  let organiserPremium: any;
  let organiserPremiumToken: string;

  const payload = {
    title: 'Sortie EF du mardi',
    startDateTime: new Date().toISOString(),
    description: 'EF tranquille',
    locationName: 'Parc Borély',
    locationAddress: '13008 Marseille',
    locationLat: 43.258,
    locationLng: 5.383,
  };

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await prisma.eventParticipant.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    organiserFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Free' });
    organiserFreeToken = makeJwtToken(jwtService, organiserFree.id, organiserFree.email, UserPlan.FREE);

    organiserPremium = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    organiserPremiumToken = makeJwtToken(jwtService, organiserPremium.id, organiserPremium.email, UserPlan.PREMIUM);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('POST /events general error', () => {
    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).post('/events').send({}).expect(401);
    });
    it('devrait renvoyer 400 si les champs obligatoires sont manquants', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organiserFreeToken}`)
        .send({
          startDateTime: new Date().toISOString(),
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /events freemium', () => {
    it('devrait créer un event et renvoyer 201 avec les champs de base', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organiserFreeToken}`)
        .send(payload)
        .expect(201);

      const body = res.body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(payload.title);
      expect(body.status).toBe(EventStatus.PLANNED);
      expect(typeof body.eventCode).toBe('string');
      expect(body.eventCode).toHaveLength(6);

      expect(typeof body.startDateTime).toBe('string');
      expect(new Date(body.startDateTime).toISOString()).toBe(body.startDateTime);

      const eventInDb = await prisma.event.findUnique({
        where: { id: body.id },
      });

      expect(eventInDb).not.toBeNull();
      expect(eventInDb?.organiserId).toBe(organiserFree.id);
      expect(eventInDb?.status).toBe(EventStatus.PLANNED);
    });
    it('Free ne peut pas créer plusieurs events dans la meme semaine', async () => {
      await request(app.getHttpServer()).post('/events').set('Authorization', `Bearer ${organiserFreeToken}`).send(payload).expect(403);
    });
  });
  describe('POST /events Premium', () => {
    it('Premium peut créer plusieurs events dans la meme semaine', async () => {
      await request(app.getHttpServer()).post('/events').set('Authorization', `Bearer ${organiserPremiumToken}`).send(payload).expect(201);
      await request(app.getHttpServer()).post('/events').set('Authorization', `Bearer ${organiserPremiumToken}`).send(payload).expect(201);
      const eventsInDb = await prisma.event.findMany({
        where: { organiserId: organiserPremium.id },
      });
      expect(eventsInDb.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('EventsController – Get /events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userFree: any;
  let userFreeToken: string;
  let userPremium: any;

  const payload = {
    title: 'Sortie EF du mardi',
    startDateTime: new Date().toISOString(),
    description: 'EF tranquille',
    locationName: 'Parc Borély',
    locationAddress: '13008 Marseille',
    locationLat: 43.258,
    locationLng: 5.383,
  };

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await prisma.eventParticipant.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    userFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Free' });
    userFreeToken = makeJwtToken(jwtService, userFree.id, userFree.email, UserPlan.FREE);

    userPremium = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
  });
  afterAll(async () => {
    await app.close();
  });

  describe('GET /events/:eventId', () => {
    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).get('/events/some-id').expect(401);
    });

    it('devrait renvoyer 404 si l’event n’existe pas', async () => {
      const res = await request(app.getHttpServer())
        .get('/events/event-inexistant-123')
        .set('Authorization', `Bearer ${userFreeToken}`)
        .expect(404);

      expect(res.body.message).toContain('Event not found');
    });
    it('devrait renvoyer 200 avec organiser, participants et currentUserParticipation', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${userFreeToken}`)
        .send(payload)
        .expect(201);
      const createdEventId = createRes.body.id;

      await prisma.eventParticipant.create({
        data: {
          eventId: createdEventId,
          userId: userPremium.id,
          status: EventParticipantStatus.GOING,
          eventRouteId: null,
          eventGroupId: null,
        },
      });
      const res = await request(app.getHttpServer())
        .get(`/events/${createdEventId}`)
        .set('Authorization', `Bearer ${userFreeToken}`)
        .expect(200);

      const body = res.body;
      // --- Bloc event --
      expect(body.event).toBeDefined();
      expect(body.event.id).toBe(createdEventId);
      expect(body.event.title).toBe(payload.title);
      expect(body.event.description).toBe(payload.description);
      expect(body.event.status).toBe(EventStatus.PLANNED);

      expect(typeof body.event.startDateTime).toBe('string');
      expect(new Date(body.event.startDateTime).toISOString()).toBe(body.event.startDateTime);

      expect(body.event.locationName).toBe(payload.locationName);
      expect(body.event.locationAddress).toBe(payload.locationAddress);
      expect(body.event.locationLat).toBe(payload.locationLat);
      expect(body.event.locationLng).toBe(payload.locationLng);

      expect(typeof body.event.eventCode).toBe('string');
      expect(body.event.eventCode).toHaveLength(6);

      // --- Bloc organiser ---
      expect(body.organiser).toBeDefined();
      expect(body.organiser.id).toBe(userFree.id);
      expect(typeof body.organiser.displayName).toBe('string');
      // avatarUrl peut être null
      expect(body.organiser).toHaveProperty('avatarUrl');

      // --- Bloc participants ---
      expect(Array.isArray(body.participants)).toBe(true);
      expect(body.participants.length).toBeGreaterThanOrEqual(2);

      const organiserParticipant = body.participants.find((p: any) => p.userId === userFree.id);
      const runner2Participant = body.participants.find((p: any) => p.userId === userPremium.id);

      expect(organiserParticipant).toBeDefined();
      expect(organiserParticipant.status).toBe(EventParticipantStatus.GOING);

      expect(runner2Participant).toBeDefined();
      expect(runner2Participant.status).toBe(EventParticipantStatus.GOING);

      // eventRouteId / eventGroupId nullable
      expect(organiserParticipant).toHaveProperty('eventRouteId');
      expect(organiserParticipant).toHaveProperty('eventGroupId');
      expect(runner2Participant).toHaveProperty('eventRouteId');
      expect(runner2Participant).toHaveProperty('eventGroupId');

      // --- Bloc currentUserParticipation ---
      expect(body.currentUserParticipation).toBeDefined();
      expect(body.currentUserParticipation.userId).toBe(userFree.id);

      // cohérence avec le tableau participants
      expect(body.currentUserParticipation.status).toBe(organiserParticipant.status);
      expect(body.currentUserParticipation.eventRouteId).toBe(organiserParticipant.eventRouteId);
      expect(body.currentUserParticipation.eventGroupId).toBe(organiserParticipant.eventGroupId);
    });
  });
});

describe('EventsController – Pacth /event (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userFree: any;
  let userFreeToken: string;
  let userPremium: any;
  let userPremiumToken: string;
  let event: any;
  let runnerParticipant: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await prisma.eventParticipant.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    userFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Free' });
    userFreeToken = makeJwtToken(jwtService, userFree.id, userFree.email, UserPlan.FREE);

    userPremium = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    userPremiumToken = makeJwtToken(jwtService, userPremium.id, userPremium.email, UserPlan.PREMIUM);

    event = await prisma.event.create({
      data: {
        organiserId: userFree.id,
        title: 'Event pour promotion',
        description: null,
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        locationName: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
        eventCode: 'PROMO01',
      },
    });

    runnerParticipant = await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: userPremium.id,
        status: EventParticipantStatus.GOING,
        role: RoleInEvent.PARTICIPANT,
        eventRouteId: null,
        eventGroupId: null,
      },
    });
  });
  afterAll(async () => {
    await app.close();
  });
  describe('PATCH /events/:eventId/participants/:participantId/role', () => {
    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${event.id}/participants/${runnerParticipant.id}/role`)
        .send({ roleInEvent: 'ENCADRANT' })
        .expect(401);
    });
    it("devrait renvoyer 404 si event n'existe pas", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/events/123/participants/${runnerParticipant.id}/role`)
        .set('Authorization', `Bearer ${userFreeToken}`)
        .send({ roleInEvent: 'ENCADRANT' })
        .expect(404);
      expect(res.body.message).toContain('Event not found');
    });
    it("devrait renvoyer 404 si participant n'existe pas", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/events/${event.id}/participants/123/role`)
        .set('Authorization', `Bearer ${userFreeToken}`)
        .send({ roleInEvent: 'ENCADRANT' })
        .expect(404);
      expect(res.body.message).toContain('Participant not found for this event');
    });
    it('devrait renvoyer 403 si le caller n’est pas l’organisateur', async () => {
      await request(app.getHttpServer())
        .patch(`/events/${event.id}/participants/${runnerParticipant.id}/role`)
        .set('Authorization', `Bearer ${userPremiumToken}`)
        .send({ roleInEvent: 'ENCADRANT' })
        .expect(403);
    });
    it('devrait promouvoir un participant en encadrant et renvoyer 200', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/events/${event.id}/participants/${userPremium.id}/role`)
        .set('Authorization', `Bearer ${userFreeToken}`)
        .send({ roleInEvent: 'ENCADRANT' })
        .expect(200);

      const body = response.body;

      expect(body).toHaveProperty('userId', userPremium.id);
      expect(body).toHaveProperty('roleInEvent', 'ENCADRANT');
      expect(body).toHaveProperty('status', 'GOING');
      expect(body).toHaveProperty('eventRouteId', null);
      expect(body).toHaveProperty('eventGroupId', null);

      // Vérifier en base que le rôle et le statut sont bien mis à jour
      const updated = await prisma.eventParticipant.findUnique({
        where: { id: runnerParticipant.id },
      });

      expect(updated?.role).toBe(RoleInEvent.ENCADRANT);
      expect(updated?.status).toBe(EventParticipantStatus.GOING);
    });
  });
});
