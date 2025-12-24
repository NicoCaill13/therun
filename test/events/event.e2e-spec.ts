import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan, EventStatus, EventParticipantStatus, RoleInEvent, RouteType } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearEventsAndRoutes } from '../e2e-utils';

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

    await clearEventsAndRoutes(prisma);

    organiserFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Free' });
    organiserFreeToken = makeJwtToken(jwtService, organiserFree.id, organiserFree.email, UserPlan.FREE);

    organiserPremium = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    organiserPremiumToken = makeJwtToken(jwtService, organiserPremium.id, organiserPremium.email, UserPlan.PREMIUM);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('POST /events general', () => {
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
      expect(body.eventCode.length).toBeGreaterThanOrEqual(5);
      expect(body.eventCode.length).toBeLessThanOrEqual(8);
      expect(body.eventCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5,8}$/);

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
    it('devrait créer automatiquement un EventParticipant ORGANISER pour le créateur', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organiserPremiumToken}`)
        .send(payload)
        .expect(201);

      const eventId = response.body.id;

      // Assert: vérifier la présence de l’EventParticipant en DB
      const ep = await prisma.eventParticipant.findFirst({
        where: {
          eventId,
          userId: organiserPremium.id,
        },
      });

      expect(ep).toBeDefined();
      expect(ep!.role).toBe(RoleInEvent.ORGANISER);
      expect(ep!.status).toBe(EventParticipantStatus.GOING);

      // Et vérif rapide que organiserId et EventParticipant sont cohérents
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      expect(event).not.toBeNull();
      expect(event!.organiserId).toBe(organiserPremium.id);
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

    await clearEventsAndRoutes(prisma);

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
      expect(body.event.eventCode.length).toBeGreaterThanOrEqual(5);
      expect(body.event.eventCode.length).toBeLessThanOrEqual(8);
      expect(body.event.eventCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5,8}$/);

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

    await clearEventsAndRoutes(prisma);

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

      const updated = await prisma.eventParticipant.findUnique({
        where: { id: runnerParticipant.id },
      });

      expect(updated?.role).toBe(RoleInEvent.ENCADRANT);
      expect(updated?.status).toBe(EventParticipantStatus.GOING);
    });
  });
});

describe('EventsController (e2e) – POST /events/:eventId/complete', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userFree: any;
  let userFreeToken: string;
  let userPremium: any;
  let userPremiumToken: string;
  let event: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearEventsAndRoutes(prisma);

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
    await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: userFree.id,
        status: EventParticipantStatus.GOING,
        role: RoleInEvent.ORGANISER,
      },
    });

    await prisma.eventParticipant.create({
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

  it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
    await request(app.getHttpServer()).patch(`/events/${event.id}/complete`).expect(401);
  });

  it('devrait renvoyer 404 si l’event n’existe pas', async () => {
    await request(app.getHttpServer())
      .patch(`/events/event-inexistant-123/complete`)
      .set('Authorization', `Bearer ${userFreeToken}`)
      .expect(404);
  });

  it('devrait renvoyer 403 si le user courant n’est pas l’organisateur', async () => {
    await request(app.getHttpServer()).patch(`/events/${event.id}/complete`).set('Authorization', `Bearer ${userPremiumToken}`).expect(403);
  });

  it('devrait passer l’event en COMPLETED et renvoyer le payload détaillé', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/events/${event.id}/complete`)
      .set('Authorization', `Bearer ${userFreeToken}`)
      .expect(200);

    const body = res.body;
    // On s’attend au même shape que GET /events/:id
    expect(body).toHaveProperty('event');
    expect(body.event).toHaveProperty('id', event.id);
    expect(body.event).toHaveProperty('status', 'COMPLETED');

    expect(body).toHaveProperty('organiser');
    expect(body.organiser).toHaveProperty('id', userFree.id);

    expect(Array.isArray(body.participants)).toBe(true);
    expect(body.participants.length).toBeGreaterThanOrEqual(2);

    const eventInDb = await prisma.event.findUnique({ where: { id: event.id } });
    expect(eventInDb?.status).toBe(EventStatus.COMPLETED);
  });

  it('devrait être idempotent si l’event est déjà COMPLETED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/events/${event.id}/complete`)
      .set('Authorization', `Bearer ${userFreeToken}`)
      .expect(200);

    expect(res.body.event.status).toBe('COMPLETED');
  });
});

describe('EventRoutesController – /events/:eventId/routes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;
  let otherUser: any;
  let otherUserToken: string;
  let premiumUser: any;
  let premiumUserToken: string;
  let event: any;
  let eventPremium: any;
  let route: any;
  let routePremium: any;
  let eventRoute: any;
  // Polyline de démo Google (3 points), distance > 0
  const TEST_POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearEventsAndRoutes(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);

    premiumUser = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    premiumUserToken = makeJwtToken(jwtService, premiumUser.id, premiumUser.email, UserPlan.PREMIUM);

    event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
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
    eventPremium = await prisma.event.create({
      data: {
        organiserId: premiumUser.id,
        title: 'Event pour promotion',
        description: null,
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        locationName: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
        eventCode: 'PREMI01',
      },
    });
    route = await prisma.route.create({
      data: {
        ownerId: organiser.id,
        name: `Route-1`,
        encodedPolyline: TEST_POLYLINE,
        distanceMeters: 10000,
        centerLat: 0,
        centerLng: 0,
        radiusMeters: 1000,
        type: RouteType.ROUTE,
      },
    });
    routePremium = await prisma.route.create({
      data: {
        ownerId: premiumUser.id,
        name: `Route-Premium`,
        encodedPolyline: TEST_POLYLINE,
        distanceMeters: 10000,
        centerLat: 0,
        centerLng: 0,
        radiusMeters: 1000,
        type: RouteType.ROUTE,
      },
    });

    eventRoute = await prisma.eventRoute.create({
      data: {
        eventId: event.id,
        routeId: route.id,
        name: 'Parcours test',
        distanceMeters: 10000,
        type: RouteType.ROUTE,
        encodedPolyline: TEST_POLYLINE,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // GET /events/:eventId/routes
  // ---------------------------------------------------------------------------
  describe('GET /events/:eventId/routes', () => {
    it('devrait renvoyer 401 si non authentifié', async () => {
      await request(app.getHttpServer()).get('/events/event-1/routes').expect(401);
    });

    it("devrait renvoyer 404 si event n'existe pas", async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/event.id/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(404);
      expect(res.body.message).toBe('Event not found');
    });
    it('devrait renvoyer un tableau vide si aucun parcours pour cet event', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${eventPremium.id}/routes`)
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('devrait renvoyer la liste des EventRoute attachés à cet event', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /events/:eventId/routes – mode NEW
  // ---------------------------------------------------------------------------
  describe('POST /events/:eventId/routes – mode NEW', () => {
    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).post('/events/event-1/routes').send({}).expect(401);
    });

    it('devrait renvoyer 404 si l’event n’existe pas', async () => {
      const res = await request(app.getHttpServer())
        .post('/events/event-404/routes')
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'NEW',
          encodedPolyline: TEST_POLYLINE,
          name: 'Parcours test',
          type: 'ROUTE',
        })
        .expect(404);

      expect(res.body.message).toBe('Event not found');
    });

    it('devrait renvoyer une erreur si mode est absent', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          encodedPolyline: TEST_POLYLINE,
          name: 'Parcours sans nom',
          type: 'ROUTE',
        })
        .expect(400);

      expect(res.body.message).toStrictEqual(['mode must be one of the following values: NEW, ATTACH, COPY']);
    });

    it('devrait renvoyer 403 Si l’utilisateur authentifié n’est pas autorisé à gérer l’event ', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          mode: 'NEW',
          encodedPolyline: TEST_POLYLINE,
          name: 'Parcours test',
          type: 'ROUTE',
        })
        .expect(403);

      expect(res.body.message).toBe('Only organiser can manage routes for this event');
    });

    it('devrait renvoyer 400 si encodedPolyline est manquant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'NEW',
          name: 'Parcours test',
          type: 'ROUTE',
        })
        .expect(400);

      expect(res.body.message).toContain('encodedPolyline is required for mode NEW');
    });

    it('devrait créer un Route et un EventRoute liés et renvoyer 201 avec la structure attendue', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'NEW',
          encodedPolyline: TEST_POLYLINE,
          name: 'Création d’un nouveau parcours',
          type: 'ROUTE',
        })
        .expect(201);

      const body = res.body;

      expect(body.id).toBeDefined();
      expect(body.eventId).toBe(event.id);
      expect(typeof body.routeId).toBe('string');
      expect(body.name).toBe('Création d’un nouveau parcours');
      expect(typeof body.distanceMeters).toBe('number');
      expect(body.distanceMeters).toBeGreaterThan(0);
      expect(body.type).toBe('ROUTE');
      expect(body.encodedPolyline).toBe(TEST_POLYLINE);

      const routeInDb = await prisma.route.findFirst({
        where: { id: body.routeId },
      });
      const eventRouteInDb = await prisma.eventRoute.findFirst({
        where: { id: body.id },
      });

      expect(routeInDb).not.toBeNull();
      expect(routeInDb?.ownerId).toBe(organiser.id);
      expect(routeInDb?.encodedPolyline).toBe(TEST_POLYLINE);

      expect(eventRouteInDb).not.toBeNull();
      expect(eventRouteInDb?.eventId).toBe(event.id);
      expect(eventRouteInDb?.routeId).toBe(routeInDb?.id);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /events/:eventId/routes – mode ATTACH
  // ---------------------------------------------------------------------------
  describe('POST /events/:eventId/routes – mode ATTACH', () => {
    it('devrait renvoyer 400 si routeId est manquant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'ATTACH',
          name: 'Parcours attaché',
        })
        .expect(400);

      expect(res.body.message).toContain('routeId is required for mode ATTACH');
    });

    it('devrait renvoyer 404 si la Route n’existe pas', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'ATTACH',
          routeId: 'route-404',
          name: 'Parcours attaché',
        })
        .expect(404);

      expect(res.body.message).toBe('Route not found');
    });

    it('devrait renvoyer 403 si FREE non owner essaie d’attacher la route de quelqu’un d’autre', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'ATTACH',
          routeId: routePremium.id,
          name: 'Parcours attaché',
        })
        .expect(403);

      expect(res.body.message).toBe('You are not allowed to use this route');
    });

    it('devrait autoriser le owner de la Route à l’attacher (FREE)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'ATTACH',
          routeId: route.id,
          name: 'Parcours attaché',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        eventId: event.id,
        routeId: route.id,
        name: 'Parcours attaché',
      });

      const eventRouteInDb = await prisma.eventRoute.findFirst({
        where: { id: res.body.id },
      });
      expect(eventRouteInDb).not.toBeNull();
      expect(eventRouteInDb?.routeId).toBe(route.id);
    });

    it('devrait autoriser un PREMIUM non owner à attacher la Route', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventPremium.id}/routes`)
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .send({
          mode: 'ATTACH',
          routeId: route.id,
          name: 'Parcours attaché',
        })
        .expect(201);

      expect(res.body.routeId).toBe(route.id);
      expect(res.body.name).toBe('Parcours attaché');
    });
  });

  // ---------------------------------------------------------------------------
  // POST /events/:eventId/routes – mode COPY
  // ---------------------------------------------------------------------------
  describe('POST /events/:eventId/routes – mode COPY', () => {
    it('devrait renvoyer 400 si routeId est manquant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'COPY',
          name: 'Parcours copié',
        })
        .expect(400);

      expect(res.body.message).toContain('routeId is required for mode COPY');
    });

    it('devrait renvoyer 404 si la Route n’existe pas', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'COPY',
          routeId: 'route-404',
          name: 'Parcours copié',
        })
        .expect(404);

      expect(res.body.message).toBe('Route not found');
    });

    it('devrait renvoyer 403 si FREE non owner essaie de copier la Route de quelqu’un d’autre', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${event.id}/routes`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          mode: 'COPY',
          routeId: routePremium.id,
          name: 'Parcours copié',
        })
        .expect(403);

      expect(res.body.message).toBe('You are not allowed to copy this route');
    });

    it('devrait autoriser un PREMIUM non owner à copier la Route, en créant un nouveau Route owner=premium', async () => {
      const res = await request(app.getHttpServer())
        .post(`/events/${eventPremium.id}/routes`)
        .set('Authorization', `Bearer ${premiumUserToken}`)
        .send({
          mode: 'COPY',
          routeId: route.id,
          name: 'Parcours copié',
        })
        .expect(201);

      const body = res.body;

      expect(body.eventId).toBe(eventPremium.id);
      expect(body.name).toBe('Parcours copié');
      expect(typeof body.routeId).toBe('string');

      const copiedRoute = await prisma.route.findUnique({
        where: { id: body.routeId },
      });

      expect(copiedRoute).not.toBeNull();
      expect(copiedRoute?.ownerId).toBe(premiumUser.id);
      expect(copiedRoute?.name).toBe('Parcours copié');

      // La route originale existe toujours
      const originalRoute = await prisma.route.findUnique({
        where: { id: route.id },
      });
      expect(originalRoute).not.toBeNull();
      expect(originalRoute?.ownerId).toBe(organiser.id);
    });
  });
});
