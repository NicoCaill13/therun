import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const skipWithoutDb = !process.env.DATABASE_URL;

(skipWithoutDb ? describe.skip : describe)('SpontaneousRun (e2e)', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let userId: string;

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
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.spontaneousRun.deleteMany();
        await prisma.user.deleteMany();
        await prisma.$disconnect();
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  beforeEach(async () => {
    if (!prisma || !app) {
      throw new Error('SpontaneousRun e2e: app or prisma not initialized');
    }
    await prisma.spontaneousRun.deleteMany();
    await prisma.user.deleteMany();
    const user = await prisma.user.create({ data: {} });
    userId = user.id;
  });

  it('CRUD flow', async () => {
    if (!app) {
      throw new Error('SpontaneousRun e2e: app not initialized');
    }
    const createBody = {
      creatorId: userId,
      locationName: 'Place Morgan',
      latitude: 45.5017,
      longitude: -73.5673,
      startTime: '2026-05-08T18:30:00.000Z',
      vibe: 'Chill',
    };

    const postRes = await request(app.getHttpServer())
      .post('/spontaneous-runs')
      .send(createBody)
      .expect(201);

    const id = postRes.body.id as string;
    expect(postBodyShape(postRes.body)).toBe(true);
    expect(postRes.body.maxParticipants).toBe(15);

    const listRes = await request(app.getHttpServer())
      .get('/spontaneous-runs')
      .expect(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body).toHaveLength(1);

    const getRes = await request(app.getHttpServer())
      .get(`/spontaneous-runs/${id}`)
      .expect(200);
    expect(getRes.body.id).toBe(id);

    const patchRes = await request(app.getHttpServer())
      .patch(`/spontaneous-runs/${id}`)
      .send({ vibe: 'Intervals', maxParticipants: 20 })
      .expect(200);
    expect(patchRes.body.vibe).toBe('Intervals');
    expect(patchRes.body.maxParticipants).toBe(20);

    await request(app.getHttpServer())
      .delete(`/spontaneous-runs/${id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/spontaneous-runs/${id}`)
      .expect(404);
  });

  it('POST returns 400 when creatorId is unknown', async () => {
    if (!app) {
      throw new Error('SpontaneousRun e2e: app not initialized');
    }
    await request(app.getHttpServer())
      .post('/spontaneous-runs')
      .send({
        creatorId: 'unknown-user-id',
        locationName: 'X',
        latitude: 45,
        longitude: -73,
        startTime: '2026-05-08T18:30:00.000Z',
        vibe: 'Chill',
      })
      .expect(400);
  });
});

function postBodyShape(body: Record<string, unknown>): boolean {
  return (
    typeof body.id === 'string' &&
    typeof body.creatorId === 'string' &&
    typeof body.locationName === 'string' &&
    typeof body.latitude === 'number' &&
    typeof body.longitude === 'number' &&
    typeof body.startTime === 'string' &&
    typeof body.maxParticipants === 'number' &&
    typeof body.vibe === 'string' &&
    typeof body.createdAt === 'string'
  );
}
