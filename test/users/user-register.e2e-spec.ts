import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { createE2eApp, clearAll } from '../e2e-utils';

describe('POST /user/register (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const validPayload = {
    email: 'register-test@example.com',
    password: 'SecureP@ss123',
    firstName: 'E2E',
    lastName: 'Register',
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

  it('should register with password and return accessToken + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/register')
      .send(validPayload)
      .expect(201);

    const body = res.body.data ?? res.body;
    expect(body).toHaveProperty('accessToken');
    expect(typeof body.accessToken).toBe('string');
    expect(body.accessToken.length).toBeGreaterThan(0);

    expect(body).toHaveProperty('user');
    expect(body.user.id).toBeDefined();
    expect(body.user.email).toBe(validPayload.email.toLowerCase());
    expect(body.user.firstName).toBe('E2E');
    expect(body.user.isGuest).toBe(false);
    expect(body.user.plan).toBeDefined();

    expect(body).toHaveProperty('mergedFromGuest');
    expect(typeof body.mergedFromGuest).toBe('boolean');
  });

  it('should store hashed password (not plaintext)', async () => {
    await request(app.getHttpServer())
      .post('/user/register')
      .send(validPayload)
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: validPayload.email.toLowerCase() },
      select: { passwordHash: true },
    });

    expect(user).not.toBeNull();
    expect(user!.passwordHash).toBeDefined();
    expect(user!.passwordHash).not.toBe(validPayload.password);
    expect(user!.passwordHash!.startsWith('$2')).toBe(true); // bcrypt hash
  });

  it('should return 400 when acceptTerms is false', async () => {
    await request(app.getHttpServer())
      .post('/user/register')
      .send({ ...validPayload, acceptTerms: false })
      .expect(400);
  });

  it('should return 400 when password is too short', async () => {
    await request(app.getHttpServer())
      .post('/user/register')
      .send({ ...validPayload, password: 'short' })
      .expect(400);
  });

  it('should return 400 when password is missing', async () => {
    const { password, ...noPassword } = validPayload;
    await request(app.getHttpServer())
      .post('/user/register')
      .send(noPassword)
      .expect(400);
  });

  it('should return 409 for duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/user/register')
      .send(validPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/user/register')
      .send(validPayload)
      .expect(409);
  });

  it('should merge guest on register with same email', async () => {
    await prisma.user.create({
      data: {
        email: validPayload.email.toLowerCase(),
        firstName: 'Guest',
        isGuest: true,
        plan: 'FREE',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/user/register')
      .send(validPayload)
      .expect(201);

    const body = res.body.data ?? res.body;
    expect(body.mergedFromGuest).toBe(true);
    expect(body.user.isGuest).toBe(false);
  });

  it('register token should work for GET /me', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/register')
      .send(validPayload)
      .expect(201);

    const token = (res.body.data ?? res.body).accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const meBody = meRes.body.data ?? meRes.body;
    expect(meBody.email).toBe(validPayload.email.toLowerCase());
  });
});
