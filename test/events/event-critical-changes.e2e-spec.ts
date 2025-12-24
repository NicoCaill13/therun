import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus, NotificationType, RoleInEvent, UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventsController – PATCH /events/:eventId (critical changes notifications) (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;

  let otherUser: any;
  let otherUserToken: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).patch('/events/evt_xxx').send({ startDateTime: '2030-01-01T19:30:00.000Z' }).expect(401);
  });

  it("404 si l'event n'existe pas", async () => {
    const res = await request(app.getHttpServer())
      .patch('/events/event-inexistant-123')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ startDateTime: '2030-01-01T19:30:00.000Z' })
      .expect(404);

    expect(res.body.message).toContain('Event not found');
  });

  it("403 si l'utilisateur n'est pas l'organisateur", async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Event',
        description: null,
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: null,
        locationLng: null,
        eventCode: 'EVT_403',
      },
    });

    await request(app.getHttpServer())
      .patch(`/events/${event.id}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ startDateTime: '2030-01-01T12:10:00.000Z' })
      .expect(403);
  });

  it('200 – changement horaire: crée une notif pour GOING + INVITED (pas MAYBE/DECLINED, pas guest)', async () => {
    const uGoing = await seedUser(prisma, UserPlan.FREE, { firstName: 'Going' });
    const uInv = await seedUser(prisma, UserPlan.FREE, { firstName: 'Inv' });
    const uMaybe = await seedUser(prisma, UserPlan.FREE, { firstName: 'Maybe' });
    const uDec = await seedUser(prisma, UserPlan.FREE, { firstName: 'Dec' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        description: null,
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: null,
        locationLng: null,
        eventCode: 'EVT_TIME_01',
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        // organiser souvent GOING
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },

        { eventId: event.id, userId: uGoing.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: event.id, userId: uInv.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
        { eventId: event.id, userId: uMaybe.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.MAYBE },
        { eventId: event.id, userId: uDec.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.DECLINED },

        // guest => userId null -> doit être ignoré
        { eventId: event.id, userId: null, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
      ],
    });

    await request(app.getHttpServer())
      .patch(`/events/${event.id}`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ startDateTime: '2030-01-01T12:10:00.000Z' })
      .expect(200);

    // ✅ attendu: notifications envoyées aux statuts GOING + INVITED (avec userId non null)
    // organiser + uGoing + uInv => 3
    const notifs = await prisma.notification.findMany({
      where: { eventId: event.id, type: NotificationType.EVENT_CHANGED_TIME },
      orderBy: { createdAt: 'asc' },
    });

    expect(notifs).toHaveLength(3);

    const userIds = notifs.map((n) => n.userId);
    expect(userIds).toContain(organiser.id);
    expect(userIds).toContain(uGoing.id);
    expect(userIds).toContain(uInv.id);
    expect(userIds).not.toContain(uMaybe.id);
    expect(userIds).not.toContain(uDec.id);

    for (const n of notifs) {
      const data: any = n.data;
      expect(data).toBeTruthy();
      expect(data.eventId).toBe(event.id);
      expect(data.beforeStartDateTime).toBe('2030-01-01T12:00:00.000Z');
      expect(data.afterStartDateTime).toBe('2030-01-01T12:10:00.000Z');
      expect(data).toHaveProperty('participantId');
      expect(data).toHaveProperty('participantStatus');
    }
  });

  it('200 – annulation: crée une notif CANCELLED pour GOING + INVITED uniquement', async () => {
    const uGoing = await seedUser(prisma, UserPlan.FREE, { firstName: 'Going' });
    const uInv = await seedUser(prisma, UserPlan.FREE, { firstName: 'Inv' });
    const uDec = await seedUser(prisma, UserPlan.FREE, { firstName: 'Dec' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        description: null,
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: null,
        locationLng: null,
        eventCode: 'EVT_CAN_01',
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: event.id, userId: uGoing.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: event.id, userId: uInv.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
        { eventId: event.id, userId: uDec.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.DECLINED },
      ],
    });

    await request(app.getHttpServer())
      .patch(`/events/${event.id}`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ status: EventStatus.CANCELLED })
      .expect(200);

    const notifs = await prisma.notification.findMany({
      where: { eventId: event.id, type: NotificationType.EVENT_CANCELLED },
      orderBy: { createdAt: 'asc' },
    });

    // organiser + uGoing + uInv => 3
    expect(notifs).toHaveLength(3);

    const userIds = notifs.map((n) => n.userId);
    expect(userIds).toContain(organiser.id);
    expect(userIds).toContain(uGoing.id);
    expect(userIds).toContain(uInv.id);
    expect(userIds).not.toContain(uDec.id);

    for (const n of notifs) {
      const data: any = n.data;
      expect(data).toBeTruthy();
      expect(data.eventId).toBe(event.id);
      expect(data.beforeStatus).toBe(EventStatus.PLANNED);
      expect(data.afterStatus).toBe(EventStatus.CANCELLED);
      expect(data).toHaveProperty('participantId');
      expect(data).toHaveProperty('participantStatus');
    }
  });
});
