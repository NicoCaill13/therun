import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotificationType, UserPlan } from '@prisma/client';
import { createE2eApp, clearAll, seedUser } from '../e2e-utils';
import { NotificationsService } from '@/api/notifications/notifications.service';

describe('NotificationsService (e2e) – S5.1.1', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let notifications: NotificationsService;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;

    notifications = app.get(NotificationsService);

    await clearAll(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('autorise des doublons si dedupKey = null', async () => {
    const user = await seedUser(prisma, UserPlan.FREE, { firstName: 'U1' });

    const r = await notifications.createMany([
      {
        userId: user.id,
        eventId: 'evt1',
        type: NotificationType.EVENT_BROADCAST,
        title: 't',
        body: 'b',
        dedupKey: null,
        data: { n: 1 },
      },
      {
        userId: user.id,
        eventId: 'evt1',
        type: NotificationType.EVENT_BROADCAST,
        title: 't',
        body: 'b',
        dedupKey: null,
        data: { n: 2 },
      },
    ]);

    expect(r.createdCount).toBe(2);

    const count = await prisma.notification.count({
      where: { userId: user.id, eventId: 'evt1', type: NotificationType.EVENT_BROADCAST },
    });
    expect(count).toBe(2);
  });

  it('est idempotent si dedupKey est renseigné (skipDuplicates + @@unique(userId,dedupKey))', async () => {
    const user = await seedUser(prisma, UserPlan.FREE, { firstName: 'U2' });

    const dedupKey = 'event:evt2:reminder:participant';

    const r1 = await notifications.createMany([
      {
        userId: user.id,
        eventId: 'evt2',
        type: NotificationType.EVENT_REMINDER_PARTICIPANT,
        title: 'rappel',
        body: 'H-2',
        dedupKey,
      },
    ]);
    expect(r1.createdCount).toBe(1);

    const r2 = await notifications.createMany([
      {
        userId: user.id,
        eventId: 'evt2',
        type: NotificationType.EVENT_REMINDER_PARTICIPANT,
        title: 'rappel',
        body: 'H-2',
        dedupKey,
      },
    ]);
    expect(r2.createdCount).toBe(0);

    const count = await prisma.notification.count({ where: { userId: user.id, dedupKey } });
    expect(count).toBe(1);
  });

  it('markAsRead met readAt et reste idempotent', async () => {
    const user = await seedUser(prisma, UserPlan.FREE, { firstName: 'U3' });

    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        eventId: 'evt3',
        type: NotificationType.EVENT_BROADCAST,
        title: 't',
        body: 'b',
        data: { x: 1 },
      },
    });

    const r1 = await notifications.markAsRead(user.id, notif.id);
    expect(r1.readAt).toBeTruthy();
    const firstReadAt = r1.readAt;

    const r2 = await notifications.markAsRead(user.id, notif.id);
    expect(r2.readAt).toBe(firstReadAt);
  });

  it('listForUser retourne unreadCount et supporte unreadOnly + pagination', async () => {
    const user = await seedUser(prisma, UserPlan.FREE, { firstName: 'U4' });

    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: NotificationType.EVENT_BROADCAST, title: '1', body: '1' },
        { userId: user.id, type: NotificationType.EVENT_BROADCAST, title: '2', body: '2' },
        { userId: user.id, type: NotificationType.EVENT_BROADCAST, title: '3', body: '3', readAt: new Date() },
      ],
    });

    const all = await notifications.listForUser(user.id, { page: 1, pageSize: 2 });
    expect(all.items).toHaveLength(2);
    expect(all.unreadCount).toBe(2);

    const unread = await notifications.listForUser(user.id, { page: 1, pageSize: 10, unreadOnly: true });
    for (const it of unread.items) {
      expect(it.readAt).toBeNull();
    }
  });
});
