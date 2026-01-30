import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('S8.4.1 – PATCH /admin/users/:userId/plan (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: any;

  let adminUser: any;
  let adminToken: string;

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

    // Create an "admin" user (in MVP, any authenticated user can access admin endpoints)
    adminUser = await seedUser(prisma, UserPlan.PREMIUM, {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@therun.app',
    });
    adminToken = makeJwtToken(jwtService, adminUser.id, adminUser.email, UserPlan.PREMIUM);
  });

  describe('Authentication', () => {
    it('401 if no token', async () => {
      await request(app.getHttpServer()).patch('/admin/users/some-user-id/plan').send({ plan: 'PREMIUM' }).expect(401);
    });
  });

  describe('Validation', () => {
    it('400 if plan is missing', async () => {
      const targetUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Target' });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.join(' ')).toContain('plan');
    });

    it('400 if plan is invalid', async () => {
      const targetUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Target' });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'SUPER_PREMIUM' })
        .expect(400);

      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.join(' ')).toContain('plan');
    });

    it('404 if user not found', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/users/non-existent-user-id/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM' })
        .expect(404);

      expect(res.body.message).toBe('User not found');
    });
  });

  describe('Switch FREE -> PREMIUM', () => {
    it('should upgrade user from FREE to PREMIUM', async () => {
      const targetUser = await seedUser(prisma, UserPlan.FREE, {
        firstName: 'Free',
        lastName: 'User',
        email: 'free@example.com',
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: targetUser.id,
        email: 'free@example.com',
        firstName: 'Free',
        lastName: 'User',
        previousPlan: 'FREE',
        newPlan: 'PREMIUM',
      });
      expect(res.body.planSince).toBeTruthy();
      expect(res.body.changedAt).toBeTruthy();

      // Verify in database
      const updated = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(updated?.plan).toBe(UserPlan.PREMIUM);
    });

    it('should set planSince when upgrading', async () => {
      const targetUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Target' });

      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM' })
        .expect(200);

      const updated = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(updated?.planSince).toBeTruthy();
    });
  });

  describe('Switch PREMIUM -> FREE', () => {
    it('should downgrade user from PREMIUM to FREE', async () => {
      const targetUser = await seedUser(prisma, UserPlan.PREMIUM, {
        firstName: 'Premium',
        lastName: 'User',
        email: 'premium@example.com',
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'FREE' })
        .expect(200);

      expect(res.body).toMatchObject({
        id: targetUser.id,
        previousPlan: 'PREMIUM',
        newPlan: 'FREE',
      });

      const updated = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(updated?.plan).toBe(UserPlan.FREE);
    });
  });

  describe('Custom dates', () => {
    it('should accept custom planSince date', async () => {
      const targetUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Target' });
      const customDate = '2025-01-15T00:00:00.000Z';

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM', planSince: customDate })
        .expect(200);

      expect(new Date(res.body.planSince).toISOString()).toBe(customDate);
    });

    it('should accept custom planUntil date (expiration)', async () => {
      const targetUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Target' });
      const expirationDate = '2026-12-31T23:59:59.000Z';

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM', planUntil: expirationDate })
        .expect(200);

      expect(new Date(res.body.planUntil).toISOString()).toBe(expirationDate);
    });
  });

  describe('Idempotence', () => {
    it('should be idempotent (same plan twice)', async () => {
      const targetUser = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Target' });

      // First call
      await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM' })
        .expect(200);

      // Second call - should work fine
      const secondRes = await request(app.getHttpServer())
        .patch(`/admin/users/${targetUser.id}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ plan: 'PREMIUM' })
        .expect(200);

      expect(secondRes.body.previousPlan).toBe('PREMIUM');
      expect(secondRes.body.newPlan).toBe('PREMIUM');
    });
  });
});
