import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/db/prisma.service';
import { applyMainLikeHttpLayer } from './apply-main-like-http-layer';

const skipWithoutDb = !process.env.DATABASE_URL;

(skipWithoutDb ? describe.skip : describe)('User onboarding (e2e)', () => {
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
      throw new Error('User onboarding e2e: prisma not initialized');
    }
    await prisma.runParticipant.deleteMany();
    await prisma.spontaneousRun.deleteMany();
    await prisma.user.deleteMany();
  });

  it('GET /api/v1/users/me/onboarding rejects missing X-User-Id', async () => {
    if (!app) {
      throw new Error('User onboarding e2e: app not initialized');
    }
    await request(app.getHttpServer()).get('/api/v1/users/me/onboarding').expect(400);
  });

  it('GET /api/v1/users/me/onboarding returns 404 for unknown user', async () => {
    if (!app) {
      throw new Error('User onboarding e2e: app not initialized');
    }
    await request(app.getHttpServer())
      .get('/api/v1/users/me/onboarding')
      .set('X-User-Id', 'nonexistent-user-id')
      .expect(404);
  });

  it('GET /api/v1/users/me/onboarding returns defaults', async () => {
    if (!app || !prisma) {
      throw new Error('User onboarding e2e: app not initialized');
    }
    const user = await prisma.user.create({ data: {} });
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/me/onboarding')
      .set('X-User-Id', user.id)
      .expect(200);

    const body = unwrapData<{
      hasCompletedOnboarding: boolean;
      consentDataBrokering: boolean;
    }>(res.body);
    expect(body.hasCompletedOnboarding).toBe(false);
    expect(body.consentDataBrokering).toBe(false);
  });

  it('PATCH /api/v1/users/me/onboarding rejects empty body', async () => {
    if (!app || !prisma) {
      throw new Error('User onboarding e2e: app not initialized');
    }
    const user = await prisma.user.create({ data: {} });
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/onboarding')
      .set('X-User-Id', user.id)
      .send({})
      .expect(400);
  });

  it('PATCH /api/v1/users/me/onboarding updates flags and returns them', async () => {
    if (!app || !prisma) {
      throw new Error('User onboarding e2e: app not initialized');
    }
    const user = await prisma.user.create({ data: {} });
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/me/onboarding')
      .set('X-User-Id', user.id)
      .send({
        hasCompletedOnboarding: true,
        consentDataBrokering: true,
      })
      .expect(200);

    const body = unwrapData<{
      hasCompletedOnboarding: boolean;
      consentDataBrokering: boolean;
    }>(res.body);
    expect(body.hasCompletedOnboarding).toBe(true);
    expect(body.consentDataBrokering).toBe(true);

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.hasCompletedOnboarding).toBe(true);
    expect(row?.consentDataBrokering).toBe(true);
  });
});

function unwrapData<T>(body: Record<string, unknown>): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}
