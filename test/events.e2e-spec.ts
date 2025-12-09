// test/events.e2e-spec.ts

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';

import { AppModule } from '../src/app.module';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'DEV_ONLY_SECRET_CHANGE_ME';

function makeTestToken(
  payload: Partial<{ sub: string; email: string; plan: string }> = {},
) {
  const basePayload = {
    sub: 'user-test-123',
    email: 'test@example.com',
    plan: 'FREE',
    ...payload,
  };

  return jwt.sign(basePayload, TEST_JWT_SECRET, {
    expiresIn: '1h',
  });
}

describe('EventsController (e2e) – POST /events', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Si tu as déjà ces pipes dans main.ts, on les remet ici pour que le comportement soit identique
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    await prisma.event.deleteMany();

    await prisma.user.deleteMany({
      where: { id: 'user-test-123' },
    });

    await prisma.user.create({
      data: {
        id: 'user-test-123',
        email: 'test@example.com',
        firstName: 'test',
        plan: UserPlan.FREE,
        // ...
      },
    });
  });

  beforeEach(async () => {
    // Optionnel mais propre : on nettoie les events entre les tests
    await prisma.event.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({
        title: 'Run du jeudi',
        startDateTime: new Date().toISOString(),
      })
      .expect(401);
  });

  it('devrait renvoyer 400 si les champs obligatoires sont manquants', async () => {
    const token = makeTestToken();

    // manqué: title
    await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        startDateTime: new Date().toISOString(),
      })
      .expect(400);

    // manqué: startDateTime
    await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Run sans date',
      })
      .expect(400);
  });

  it('devrait créer un event et renvoyer 201 avec les champs de base', async () => {
    const token = makeTestToken({ sub: 'user-test-123' });

    const payload = {
      title: 'Run du jeudi soir',
      startDateTime: new Date().toISOString(),
      description: 'Sortie EF 8km tranquille',
      locationName: 'Parc Borely',
      locationLat: 43.259,
      locationLng: 5.385,
    };

    const response = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    const body = response.body;

    // Check basique sur la réponse
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('title', payload.title);
    expect(body).toHaveProperty('startDateTime');
    expect(body).toHaveProperty('status', 'PLANNED');

    // Les infos de lieu si tu les renvoies
    expect(body.locationName).toBe(payload.locationName);
    expect(body.locationLat).toBe(payload.locationLat);
    expect(body.locationLng).toBe(payload.locationLng);

    // Vérifie qu’en base l’event est bien créé avec organiserId = sub du token
    const eventInDb = await prisma.event.findUnique({
      where: { id: body.id },
    });
    console.log(eventInDb);

    expect(eventInDb).not.toBeNull();
    expect(eventInDb?.organiserId).toBe('user-test-123');
    expect(eventInDb?.title).toBe(payload.title);
    expect(eventInDb?.status).toBe('PLANNED');
  });
});
