import * as request from 'supertest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { clearAll } from '../e2e-utils';

describe('User register / login / logout (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAll(prisma);
  });

  it('register assigns password, login works, logout returns 204', async () => {
    const plainPassword = 'Secret1!';

    const registerRes = await request(app.getHttpServer())
      .post('/user/register')
      .send({
        email: 'new@example.com',
        firstName: 'Nico',
        password: plainPassword,
        acceptTerms: true,
      })
      .expect(201);

    expect(registerRes.body.accessToken).toBeDefined();

    const row = await prisma.user.findUnique({
      where: { email: 'new@example.com' },
      select: { passwordHash: true },
    });
    expect(row?.passwordHash).toBeDefined();

    const loginRes = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: 'new@example.com', password: plainPassword })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/user/logout')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(204);
  });

  it('login returns 401 for bad password', async () => {
    const hash = await bcrypt.hash('GoodPass1!', 10);
    await prisma.user.create({
      data: {
        email: 'u@example.com',
        firstName: 'U',
        isGuest: false,
        plan: UserPlan.FREE,
        acceptedTermsAt: new Date(),
        passwordHash: hash,
      },
    });

    await request(app.getHttpServer())
      .post('/user/login')
      .send({ email: 'u@example.com', password: 'wrong-password' })
      .expect(401);
  });
});
