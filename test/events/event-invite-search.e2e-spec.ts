import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventInvitesController – GET /events/:eventId/invite/search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;

  let otherUser: any;
  let otherUserToken: string;

  let event: any;

  const expectMessageContains = (message: any, needle: string) => {
    if (Array.isArray(message)) {
      expect(message.join(' | ')).toContain(needle);
      return;
    }
    expect(String(message)).toContain(needle);
  };

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        title: 'Run du jeudi',
        startDateTime: new Date('2026-01-01T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: `EVT${Date.now().toString().slice(-6)}`,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const seedSearchUsers = async () => {
    // Users matchables
    await prisma.user.create({
      data: {
        firstName: 'Alice',
        lastName: 'Runner',
        email: 'alice.runner@example.com',
        isGuest: false,
        plan: UserPlan.FREE,
      },
    });

    await prisma.user.create({
      data: {
        firstName: 'Nicolas',
        lastName: 'Cailleux',
        email: 'nico@example.com',
        isGuest: false,
        plan: UserPlan.FREE,
      },
    });

    // Guest (doit être exclu)
    await prisma.user.create({
      data: {
        firstName: 'Alina',
        lastName: 'Guest',
        email: null,
        isGuest: true,
        plan: UserPlan.FREE,
      },
    });
  };

  describe('Auth / Guards / Access', () => {
    it('401 si pas de token', async () => {
      await request(app.getHttpServer()).get(`/events/${event.id}/invite/search?query=al`).expect(401);
    });

    it('404 si eventId inconnu', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/evt-does-not-exist/invite/search?query=al`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(404);

      expect(res.body.message).toBe('Event not found');
    });

    it("403 si l'utilisateur n'est pas l'organisateur", async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=al`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(res.body.message).toBe('Only organiser can invite participants');
    });
  });

  describe('Validation query params', () => {
    it('400 si query manquant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
      expectMessageContains(res.body.message, 'query');
    });

    it('400 si query trop court (<2)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=a`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
      expectMessageContains(res.body.message, 'query');
    });

    it('400 si page invalide', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=al&page=0`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
      expectMessageContains(res.body.message, 'page');
    });

    it('400 si pageSize invalide (>50)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=al&pageSize=100`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
      expectMessageContains(res.body.message, 'pageSize');
    });
  });

  describe('Search behavior', () => {
    beforeAll(async () => {
      await seedSearchUsers();
    });

    it('retourne une réponse paginée avec la structure {items,page,pageSize,totalCount,totalPages}', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=al&page=1&pageSize=20`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('pageSize', 20);
      expect(res.body).toHaveProperty('totalCount');
      expect(res.body).toHaveProperty('totalPages');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('filtre sur firstName/lastName/email (case-insensitive) et exclut les guests', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=ALI`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(200);

      const names = res.body.items.map((u: any) => u.firstName);
      expect(names).toContain('Alice');
      expect(names).not.toContain('Alina'); // guest exclu
    });

    it("exclut l'organisateur lui-même de la recherche", async () => {
      // organiser.firstName = "Organiser" (seedUser)
      const res = await request(app.getHttpServer())
        .get(`/events/${event.id}/invite/search?query=Organ`)
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(200);

      const ids = res.body.items.map((u: any) => u.id);
      expect(ids).not.toContain(organiser.id);
    });
  });
});
