import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/db/prisma.service';
import { applyMainLikeHttpLayer } from './apply-main-like-http-layer';

const skipWithoutDb = !process.env.DATABASE_URL;

(skipWithoutDb ? describe.skip : describe)('User location (e2e)', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;

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
    if (!prisma) {
      throw new Error('User location e2e: prisma not initialized');
    }
    await prisma.runParticipant.deleteMany();
    await prisma.spontaneousRun.deleteMany();
    await prisma.user.deleteMany();
  });

  it('PATCH /api/v1/users/me/location rejects missing X-User-Id', async () => {
    if (!app) {
      throw new Error('User location e2e: app not initialized');
    }
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/location')
      .send({ latitude: 45.5, longitude: -73.6 })
      .expect(400);
  });

  it('PATCH /api/v1/users/me/location returns 404 for unknown user', async () => {
    if (!app) {
      throw new Error('User location e2e: app not initialized');
    }
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/location')
      .set('X-User-Id', 'nonexistent-user-id')
      .send({ latitude: 45.5, longitude: -73.6 })
      .expect(404);
  });

  it('PATCH /api/v1/users/me/location updates coordinates', async () => {
    if (!app || !prisma) {
      throw new Error('User location e2e: app not initialized');
    }
    const user = await prisma.user.create({ data: {} });
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me/location')
      .set('X-User-Id', user.id)
      .send({
        latitude: 45.501,
        longitude: -73.567,
        expoPushToken: 'ExponentPushToken[e2e]',
      })
      .expect(200);

    const body = unwrapData<{ ok: boolean }>(res.body);
    expect(body.ok).toBe(true);

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.lastKnownLatitude).toBeCloseTo(45.501, 5);
    expect(row?.lastKnownLongitude).toBeCloseTo(-73.567, 5);
    expect(row?.expoPushToken).toBe('ExponentPushToken[e2e]');
  });
});

function unwrapData<T>(body: Record<string, unknown>): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}
