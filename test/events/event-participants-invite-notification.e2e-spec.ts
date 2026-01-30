import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe("S3.1.2 – Notification d'invitation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;

  let invitedUser: any;

  let event: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.PREMIUM, {
      firstName: 'Organiser',
      lastName: 'Test',
    });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.PREMIUM);

    invitedUser = await seedUser(prisma, UserPlan.FREE, {
      firstName: 'Invited',
      lastName: 'User',
    });

    event = await prisma.event.create({
      data: {
        title: 'Run du jeudi soir',
        startDateTime: new Date('2026-02-01T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: `NOTIF${Date.now().toString().slice(-6)}`,
        locationName: "Parc de la Tête d'Or",
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean notifications before each test
    await prisma.notification.deleteMany();
    await prisma.eventParticipant.deleteMany({ where: { eventId: event.id } });
  });

  it('should create a notification when inviting a user', async () => {
    // Invite the user
    const res = await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/invite`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ userId: invitedUser.id, role: 'PARTICIPANT' })
      .expect(201);

    expect(res.body.status).toBe('INVITED');

    // Check notification was created
    const notifications = await prisma.notification.findMany({
      where: { userId: invitedUser.id },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('EVENT_INVITATION');
    expect(notifications[0].eventId).toBe(event.id);
    expect(notifications[0].title).toContain('Invitation');
    expect(notifications[0].title).toContain(event.title);
    expect(notifications[0].body).toContain('Organiser Test');
    expect(notifications[0].body).toContain("t'invite à participer");
  });

  it('should include event details in the notification body', async () => {
    await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/invite`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ userId: invitedUser.id, role: 'ENCADRANT' })
      .expect(201);

    const notification = await prisma.notification.findFirst({
      where: { userId: invitedUser.id },
    });

    expect(notification).toBeTruthy();
    expect(notification!.body).toContain('Départ:');
    expect(notification!.body).toContain("Lieu: Parc de la Tête d'Or");
  });

  it('should create a new notification when re-inviting a declined user', async () => {
    // First invitation
    await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/invite`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ userId: invitedUser.id, role: 'PARTICIPANT' })
      .expect(201);

    // Update to DECLINED
    await prisma.eventParticipant.updateMany({
      where: { eventId: event.id, userId: invitedUser.id },
      data: { status: 'DECLINED' },
    });

    // Clear notifications
    await prisma.notification.deleteMany();

    // Re-invite
    await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/invite`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ userId: invitedUser.id, role: 'PARTICIPANT' });

    // Should have a new notification
    const notifications = await prisma.notification.findMany({
      where: { userId: invitedUser.id },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('EVENT_INVITATION');
  });

  it('notification data should contain participantId and organiserName', async () => {
    const res = await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/invite`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ userId: invitedUser.id, role: 'PARTICIPANT' })
      .expect(201);

    const notification = await prisma.notification.findFirst({
      where: { userId: invitedUser.id },
    });

    expect(notification).toBeTruthy();
    expect(notification!.data).toBeTruthy();

    const data = notification!.data as any;
    expect(data.eventId).toBe(event.id);
    expect(data.participantId).toBe(res.body.id);
    expect(data.organiserName).toBe('Organiser Test');
  });
});
