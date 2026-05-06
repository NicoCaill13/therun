import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/db/prisma.service';
import { applyMainLikeHttpLayer } from './apply-main-like-http-layer';

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
    applyMainLikeHttpLayer(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.runParticipant.deleteMany();
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
    await prisma.runParticipant.deleteMany();
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
      .post('/api/spontaneous-runs')
      .send(createBody)
      .expect(201);

    const created = unwrapData<Record<string, unknown>>(postRes.body);
    const id = created.id as string;
    expect(postBodyShape(created)).toBe(true);
    expect(created.maxParticipants).toBe(15);
    expect(created.status).toBe('ACTIVE');

    const listRes = await request(app.getHttpServer())
      .get('/api/spontaneous-runs')
      .expect(200);
    const list = unwrapData<unknown[]>(listRes.body);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(1);

    const getRes = await request(app.getHttpServer())
      .get(`/api/spontaneous-runs/${id}`)
      .expect(200);
    expect(unwrapData<{ id: string }>(getRes.body).id).toBe(id);

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/spontaneous-runs/${id}`)
      .send({ vibe: 'Intervals', maxParticipants: 20 })
      .expect(200);
    const patched = unwrapData<{ vibe: string; maxParticipants: number }>(
      patchRes.body,
    );
    expect(patched.vibe).toBe('Intervals');
    expect(patched.maxParticipants).toBe(20);

    await request(app.getHttpServer())
      .delete(`/api/spontaneous-runs/${id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/spontaneous-runs/${id}`)
      .expect(404);
  });

  it('POST returns 400 when creatorId is unknown', async () => {
    if (!app) {
      throw new Error('SpontaneousRun e2e: app not initialized');
    }
    await request(app.getHttpServer())
      .post('/api/spontaneous-runs')
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

  it('RunParticipant composite id prevents duplicate join', async () => {
    if (!prisma) {
      throw new Error('SpontaneousRun e2e: prisma not initialized');
    }
    const run = await prisma.spontaneousRun.create({
      data: {
        creatorId: userId,
        locationName: 'Park',
        latitude: 45,
        longitude: -73,
        startTime: new Date('2026-05-08T18:30:00.000Z'),
        vibe: 'Chill',
      },
    });
    await prisma.runParticipant.create({
      data: { userId, runId: run.id },
    });
    await expect(
      prisma.runParticipant.create({
        data: { userId, runId: run.id },
      }),
    ).rejects.toBeDefined();
  });
});

function unwrapData<T>(body: Record<string, unknown>): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

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
    typeof body.status === 'string' &&
    typeof body.createdAt === 'string'
  );
}
