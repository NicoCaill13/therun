import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { createE2eApp, clearAll } from '../e2e-utils';

describe('POST /user/login (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const validRegisterPayload = {
    email: 'login-test@example.com',
    password: 'SecureP@ss123',
    firstName: 'Login',
    lastName: 'Test',
    acceptTerms: true,
  };

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAll(prisma);
  });

  it('should login successfully after register', async () => {
    // Arrange: register first
    await request(app.getHttpServer())
      .post('/user/register')
      .send(validRegisterPayload)
      .expect(201);

    // Act: login
    const res = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: validRegisterPayload.email, password: validRegisterPayload.password })
      .expect(200);

    // Assert
    const body = res.body.data ?? res.body;
    expect(body).toHaveProperty('accessToken');
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(0);
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('id');
    expect(body.user.email).toBe(validRegisterPayload.email.toLowerCase());
    expect(body.user.firstName).toBe(validRegisterPayload.firstName);
    expect(body.user.isGuest).toBe(false);
  });

  it('should return 401 for wrong password', async () => {
    await request(app.getHttpServer())
      .post('/user/register')
      .send(validRegisterPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: validRegisterPayload.email, password: 'WrongPassword99' })
      .expect(401);
  });

  it('should return 401 for non-existent email', async () => {
    await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: 'does-not-exist@example.com', password: 'AnyPassword1' })
      .expect(401);
  });

  it('should return 401 for guest user (no password)', async () => {
    await prisma.user.create({
      data: {
        email: 'guest@example.com',
        firstName: 'Guest',
        isGuest: true,
        plan: 'FREE',
      },
    });

    await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: 'guest@example.com', password: 'AnyPassword1' })
      .expect(401);
  });

  it('full flow: register -> login -> GET /me with token', async () => {
    await request(app.getHttpServer())
      .post('/user/register')
      .send(validRegisterPayload)
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: validRegisterPayload.email, password: validRegisterPayload.password })
      .expect(200);

    const token = (loginRes.body.data ?? loginRes.body).accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const meBody = meRes.body.data ?? meRes.body;
    expect(meBody.email).toBe(validRegisterPayload.email.toLowerCase());
  });
});
