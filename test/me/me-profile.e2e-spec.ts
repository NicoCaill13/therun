import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('S8.1.2 – GET /me profile (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    jwtService = ctx.jwtService;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAll(prisma);
  });

  describe('Authentication', () => {
    it('401 if no token', async () => {
      await request(app.getHttpServer()).get('/me').expect(401);
    });
  });

  describe('FREE user', () => {
    it('should return profile with FREE plan benefits', async () => {
      const user = await seedUser(prisma, UserPlan.FREE, {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      const token = makeJwtToken(jwtService, user.id, user.email!, UserPlan.FREE);

      const res = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body).toMatchObject({
        id: user.id,
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        isGuest: false,
        plan: 'FREE',
      });

      expect(res.body.planBenefits).toMatchObject({
        maxActiveEventsPerWeek: 1,
        globalRouteLibraryAccess: false,
      });
      expect(res.body.planBenefits.description).toContain('The Run Free');
    });

    it('should show only firstName as displayName if no lastName', async () => {
      const user = await seedUser(prisma, UserPlan.FREE, {
        firstName: 'Alice',
        lastName: null,
      });
      const token = makeJwtToken(jwtService, user.id, user.email!, UserPlan.FREE);

      const res = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body.displayName).toBe('Alice');
    });
  });

  describe('PREMIUM user', () => {
    it('should return profile with PREMIUM plan benefits', async () => {
      const user = await seedUser(prisma, UserPlan.PREMIUM, {
        firstName: 'Premium',
        lastName: 'User',
        email: 'premium@example.com',
        planSince: new Date('2025-01-01'),
      });
      const token = makeJwtToken(jwtService, user.id, user.email!, UserPlan.PREMIUM);

      const res = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body).toMatchObject({
        id: user.id,
        email: 'premium@example.com',
        firstName: 'Premium',
        lastName: 'User',
        plan: 'PREMIUM',
      });

      expect(res.body.planBenefits).toMatchObject({
        maxActiveEventsPerWeek: -1, // unlimited
        globalRouteLibraryAccess: true,
      });
      expect(res.body.planBenefits.description).toContain('The Run Premium');
    });
  });

  describe('Guest user', () => {
    it('should return profile with isGuest = true', async () => {
      const guest = await prisma.user.create({
        data: {
          firstName: 'Guest',
          lastName: null,
          email: null,
          isGuest: true,
          plan: UserPlan.FREE,
        },
      });
      const token = makeJwtToken(jwtService, guest.id, '', UserPlan.FREE);

      const res = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body.isGuest).toBe(true);
      expect(res.body.email).toBeNull();
    });
  });

  describe('Response fields', () => {
    it('should include createdAt and acceptedTermsAt', async () => {
      const termsDate = new Date('2025-06-15');
      const user = await seedUser(prisma, UserPlan.FREE, {
        firstName: 'Test',
        acceptedTermsAt: termsDate,
      });
      const token = makeJwtToken(jwtService, user.id, user.email!, UserPlan.FREE);

      const res = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body.createdAt).toBeTruthy();
      expect(res.body.acceptedTermsAt).toBe(termsDate.toISOString());
    });
  });
});
