import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';
import { EventParticipantStatus, EventStatus, RoleInEvent, UserPlan, NotificationType } from '@prisma/client';

describe('EventsController – POST /events/:eventId/broadcast (e2e)', () => {
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
    await request(app.getHttpServer()).post('/events/evt_xxx/broadcast').send({ body: 'hello' }).expect(401);
  });

  it('404 si event inexistant', async () => {
    await request(app.getHttpServer())
      .post('/events/does_not_exist/broadcast')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ body: 'hello' })
      .expect(404);
  });

  it("403 si l'utilisateur n'est pas l'organisateur", async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'BC001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${event.id}/broadcast`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ body: 'hello' })
      .expect(403);
  });

  it('400 si payload invalide (body manquant)', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'BC002',
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${event.id}/broadcast`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ title: 'x' })
      .expect(400);
  });

  it('200 crée une notif EVENT_BROADCAST pour chaque participant status != DECLINED', async () => {
    const going = await seedUser(prisma, UserPlan.FREE, { firstName: 'Going' });
    const invited = await seedUser(prisma, UserPlan.FREE, { firstName: 'Inv' });
    const maybe = await seedUser(prisma, UserPlan.FREE, { firstName: 'Maybe' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'BC003',
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        // organiser lui-même (souvent présent dans vos data)
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },

        { eventId: event.id, userId: going.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: event.id, userId: invited.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
        { eventId: event.id, userId: maybe.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.MAYBE },

        // declined => doit être ignoré
        { eventId: event.id, userId: null, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING }, // guest (userId null) ignoré par sécurité
      ],
    });

    const res = await request(app.getHttpServer())
      .post(`/events/${event.id}/broadcast`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ body: 'Info: départ décalé de 10 min' })
      .expect(200);

    expect(res.body.sentCount).toBe(4); // organiser + going + invited + maybe (guest ignoré)

    const notifs = await prisma.notification.findMany({
      where: { eventId: event.id, type: NotificationType.EVENT_BROADCAST },
      orderBy: { createdAt: 'asc' },
    });

    expect(notifs).toHaveLength(4);
    for (const n of notifs) {
      expect(n.title).toBe('Message de l’organisateur');
      expect(n.body).toBe('Info: départ décalé de 10 min');
    }

    const userIds = notifs.map((n) => n.userId);
    expect(userIds).toContain(organiser.id);
    expect(userIds).toContain(going.id);
    expect(userIds).toContain(invited.id);
    expect(userIds).toContain(maybe.id);
  });
});
