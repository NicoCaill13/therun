import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotificationType, UserPlan } from '@prisma/client';
import { createE2eApp, clearAll, seedUser, makeJwtToken } from '../e2e-utils';

describe('MeNotificationsController – /me/notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userA: any;
  let userAToken: string;
  let userB: any;

  let nA1: any;
  let nA2: any;
  let nB1: any;

  const unwrap = (body: any) => (body && typeof body === 'object' && 'data' in body ? body.data : body);

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    userA = await seedUser(prisma, UserPlan.FREE, { firstName: 'UserA' });
    userAToken = makeJwtToken(jwtService, userA.id, userA.email, UserPlan.FREE);

    userB = await seedUser(prisma, UserPlan.FREE, { firstName: 'UserB' });

    // Seed notifs (2 pour A, 1 pour B)
    nA1 = await prisma.notification.create({
      data: {
        userId: userA.id,
        eventId: 'evt-a',
        type: NotificationType.EVENT_BROADCAST,
        title: 'A1',
        body: 'msg A1',
        data: { foo: 'bar' },
        readAt: null,
        createdAt: new Date('2025-01-01T10:00:00.000Z'),
      },
    });

    nA2 = await prisma.notification.create({
      data: {
        userId: userA.id,
        eventId: null,
        type: NotificationType.EVENT_REMINDER_PARTICIPANT,
        title: 'A2',
        body: 'reminder A2',
        data: { foo: 'bar' },
        readAt: null,
        createdAt: new Date('2025-01-01T12:00:00.000Z'),
      },
    });

    nB1 = await prisma.notification.create({
      data: {
        userId: userB.id,
        eventId: null,
        type: NotificationType.EVENT_REMINDER_PARTICIPANT,
        title: 'B1',
        body: 'reminder B1',
        data: { foo: 'bar' },
        readAt: null,
        createdAt: new Date('2025-01-01T11:00:00.000Z'),
      },
    });

    // mark one as read
    await prisma.notification.update({ where: { id: nA1.id }, data: { readAt: new Date('2025-01-01T13:00:00.000Z') } });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /me/notifications', () => {
    it('401 si pas de token', async () => {
      await request(app.getHttpServer()).get('/me/notifications').expect(401);
    });

    it('200 retourne uniquement mes notifications + tri desc + unreadCount', async () => {
      const res = await request(app.getHttpServer()).get('/me/notifications').set('Authorization', `Bearer ${userAToken}`).expect(200);

      const payload = unwrap(res.body);

      expect(payload.items).toHaveLength(2);
      // tri desc => A2 (12h) puis A1 (10h)
      expect(payload.items[0].id).toBe(nA2.id);
      expect(payload.items[1].id).toBe(nA1.id);

      // unreadCount: A2 unread, A1 read
      expect(payload.unreadCount).toBe(1);

      // pas de notif de B
      expect(payload.items.find((x: any) => x.id === nB1.id)).toBeUndefined();
    });

    it('200 unreadOnly=true ne retourne que les non lues', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const payload = unwrap(res.body);
      expect(payload.items).toHaveLength(1);
      expect(payload.items[0].id).toBe(nA2.id);
      expect(payload.items[0].readAt).toBeNull();
    });

    it('400 si query invalide (page=0)', async () => {
      await request(app.getHttpServer()).get('/me/notifications?page=0').set('Authorization', `Bearer ${userAToken}`).expect(400);
    });

    it('pagination fonctionne', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/notifications?page=1&pageSize=1')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const payload = unwrap(res.body);
      expect(payload.items).toHaveLength(1);
      expect(payload.page).toBe(1);
      expect(payload.pageSize).toBe(1);
      expect(payload.totalCount).toBe(2);
    });
  });

  describe('PATCH /me/notifications/:notificationId/read', () => {
    it('401 si pas de token', async () => {
      await request(app.getHttpServer()).patch(`/me/notifications/${nA2.id}/read`).expect(401);
    });

    it('404 si notif inexistante', async () => {
      const res = await request(app.getHttpServer())
        .patch('/me/notifications/notif-nope/read')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.message).toBe('Notification not found');
    });

    it("404 si on tente de lire une notif d'un autre user", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/me/notifications/${nB1.id}/read`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(res.body.message).toBe('Notification not found');
    });

    it('200 marque comme lue et retourne la notif', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/me/notifications/${nA2.id}/read`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const notif = res.body;
      expect(notif.id).toBe(nA2.id);
      expect(notif.readAt).toBeTruthy();

      const inDb = await prisma.notification.findUnique({ where: { id: nA2.id } });
      expect(inDb?.readAt).not.toBeNull();
    });

    it('200 idempotent si déjà lue', async () => {
      const r1 = await request(app.getHttpServer())
        .patch(`/me/notifications/${nA2.id}/read`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const firstReadAt = unwrap(r1.body).readAt;

      const r2 = await request(app.getHttpServer())
        .patch(`/me/notifications/${nA2.id}/read`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(unwrap(r2.body).readAt).toBe(firstReadAt);
    });
  });
});
