import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { EventParticipantStatus, EventStatus, UserPlan } from '@prisma/client';

describe('EventsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let organiserId: string;
  let organiserToken: string;

  const createOrganiser = async () => {
    return await prisma.user.create({
      data: {
        email: 'organiser@test.com',
        firstName: 'John',
        lastName: 'Doe',
        isGuest: false,
        plan: UserPlan.PREMIUM,
      },
    });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Clean de base minimale
    await prisma.eventParticipant.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { in: ['organiser@test.com', 'runner2@test.com'] } },
    });

    const organiser = await createOrganiser();

    organiserId = organiser.id;

    organiserToken = jwtService.sign({
      sub: organiser.id,
      email: organiser.email,
      plan: organiser.plan,
    });
  });

  beforeEach(async () => {
    // On repart d'une base propre pour les events à chaque test
    await prisma.eventParticipant.deleteMany();
    await prisma.event.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /events', () => {
    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).post('/events').send({}).expect(401);
    });

    it('devrait renvoyer 400 si les champs obligatoires sont manquants', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organiserToken}`)
        .send({
          // title manquant
          startDateTime: new Date().toISOString(),
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('devrait créer un event et renvoyer 201 avec les champs de base', async () => {
      const payload = {
        title: 'Sortie EF du mardi',
        startDateTime: new Date().toISOString(),
        description: 'EF tranquille',
        locationName: 'Parc Borély',
        locationAddress: '13008 Marseille',
        locationLat: 43.258,
        locationLng: 5.383,
      };

      const res = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organiserToken}`)
        .send(payload)
        .expect(201);

      const body = res.body;

      expect(body.id).toBeDefined();
      expect(body.title).toBe(payload.title);
      expect(body.status).toBe(EventStatus.PLANNED);
      expect(typeof body.eventCode).toBe('string');
      expect(body.eventCode).toHaveLength(6);

      // startDateTime renvoyé au format ISO string
      expect(typeof body.startDateTime).toBe('string');
      expect(new Date(body.startDateTime).toISOString()).toBe(body.startDateTime);

      // Vérification DB basique
      const eventInDb = await prisma.event.findUnique({
        where: { id: body.id },
      });

      expect(eventInDb).not.toBeNull();
      expect(eventInDb?.organiserId).toBe(organiserId);
      expect(eventInDb?.status).toBe(EventStatus.PLANNED);
    });
  });

  describe('GET /events/:eventId', () => {
    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).get('/events/some-id').expect(401);
    });

    it('devrait renvoyer 404 si l’event n’existe pas', async () => {
      const res = await request(app.getHttpServer())
        .get('/events/event-inexistant-123')
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(404);

      expect(res.body.message).toContain('Event not found');
    });

    it('devrait renvoyer 200 avec organiser, participants et currentUserParticipation', async () => {
      // 1. On crée un deuxième user
      const runner2 = await prisma.user.create({
        data: {
          email: 'runner2@test.com',
          firstName: 'Jane',
          lastName: 'Runner',
          isGuest: false,
          plan: UserPlan.FREE,
        },
      });

      // 2. On crée l’event via l’API (POST /events)
      const createPayload = {
        title: 'Sortie EF du jeudi',
        startDateTime: new Date().toISOString(),
        description: 'Sortie cool',
        locationName: 'Parc Longchamp',
        locationAddress: '13001 Marseille',
        locationLat: 43.304,
        locationLng: 5.395,
      };

      const createRes = await request(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${organiserToken}`)
        .send(createPayload)
        .expect(201);

      const createdEventId = createRes.body.id;

      await prisma.eventParticipant.create({
        data: {
          eventId: createdEventId,
          userId: runner2.id,
          status: EventParticipantStatus.GOING,
          eventRouteId: null,
          eventGroupId: null,
          // roleInEvent à ajouter dans le futur quand le champ existera
        },
      });

      // 4. On appelle GET /events/:eventId en tant qu’organisateur
      const res = await request(app.getHttpServer())
        .get(`/events/${createdEventId}`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(200);

      const body = res.body;

      // --- Bloc event --
      expect(body.event).toBeDefined();
      expect(body.event.id).toBe(createdEventId);
      expect(body.event.title).toBe(createPayload.title);
      expect(body.event.description).toBe(createPayload.description);
      expect(body.event.status).toBe(EventStatus.PLANNED);

      expect(typeof body.event.startDateTime).toBe('string');
      expect(new Date(body.event.startDateTime).toISOString()).toBe(body.event.startDateTime);

      expect(body.event.locationName).toBe(createPayload.locationName);
      expect(body.event.locationAddress).toBe(createPayload.locationAddress);
      expect(body.event.locationLat).toBe(createPayload.locationLat);
      expect(body.event.locationLng).toBe(createPayload.locationLng);

      expect(typeof body.event.eventCode).toBe('string');
      expect(body.event.eventCode).toHaveLength(6);

      // --- Bloc organiser ---
      expect(body.organiser).toBeDefined();
      expect(body.organiser.id).toBe(organiserId);
      expect(typeof body.organiser.displayName).toBe('string');
      // avatarUrl peut être null
      expect(body.organiser).toHaveProperty('avatarUrl');

      // --- Bloc participants ---
      expect(Array.isArray(body.participants)).toBe(true);
      // On doit avoir au moins 2 participants : l’organisateur + runner2
      expect(body.participants.length).toBeGreaterThanOrEqual(2);

      const organiserParticipant = body.participants.find((p: any) => p.userId === organiserId);
      const runner2Participant = body.participants.find((p: any) => p.userId === runner2.id);

      expect(organiserParticipant).toBeDefined();
      expect(organiserParticipant.status).toBe(EventParticipantStatus.GOING);

      expect(runner2Participant).toBeDefined();
      expect(runner2Participant.status).toBe(EventParticipantStatus.GOING);

      // eventRouteId / eventGroupId nullable
      expect(organiserParticipant).toHaveProperty('eventRouteId');
      expect(organiserParticipant).toHaveProperty('eventGroupId');
      expect(runner2Participant).toHaveProperty('eventRouteId');
      expect(runner2Participant).toHaveProperty('eventGroupId');

      // TODO (quand le champ existera dans le modèle Prisma + DTO) :
      // expect(organiserParticipant).toHaveProperty('roleInEvent');
      // expect(runner2Participant).toHaveProperty('roleInEvent');

      // --- Bloc currentUserParticipation ---
      expect(body.currentUserParticipation).toBeDefined();
      expect(body.currentUserParticipation.userId).toBe(organiserId);

      // cohérence avec le tableau participants
      expect(body.currentUserParticipation.status).toBe(organiserParticipant.status);
      expect(body.currentUserParticipation.eventRouteId).toBe(organiserParticipant.eventRouteId);
      expect(body.currentUserParticipation.eventGroupId).toBe(organiserParticipant.eventGroupId);
    });
  });
});
