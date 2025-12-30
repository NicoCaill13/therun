// test/events/event-duplicate.e2e-spec.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';
import { EventStatus, RouteType, UserPlan, RoleInEvent, EventParticipantStatus } from '@prisma/client';

describe('S7.2.3 — POST /events/:eventId/duplicate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiserFree: any;
  let organiserFreeToken: string;
  let otherUser: any;
  let otherUserToken: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiserFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Free' });
    organiserFreeToken = makeJwtToken(jwtService, organiserFree.id, organiserFree.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).post('/events/evt_xxx/duplicate').send({ startDateTime: '2030-01-02T10:00:00.000Z' }).expect(401);
  });

  it('404 si event inexistant', async () => {
    await request(app.getHttpServer())
      .post('/events/evt_xxx/duplicate')
      .set('Authorization', `Bearer ${organiserFreeToken}`)
      .send({ startDateTime: '2030-01-02T10:00:00.000Z' })
      .expect(404);
  });

  it("403 si l'utilisateur n'est pas l'organisateur", async () => {
    const ev = await prisma.event.create({
      data: {
        organiserId: organiserFree.id,
        title: 'Sortie passée',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: 'DUP401',
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${ev.id}/duplicate`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ startDateTime: '2030-01-02T10:00:00.000Z' })
      .expect(403);
  });

  it('400 si event non COMPLETED', async () => {
    const ev = await prisma.event.create({
      data: {
        organiserId: organiserFree.id,
        title: 'Sortie planned',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'DUP400',
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${ev.id}/duplicate`)
      .set('Authorization', `Bearer ${organiserFreeToken}`)
      .send({ startDateTime: '2030-01-02T10:00:00.000Z' })
      .expect(400);
  });

  async function seedCompletedEventWith1Route2Groups() {
    const libRoute = await prisma.route.create({
      data: {
        ownerId: organiserFree.id,
        name: 'Boucle 8k',
        encodedPolyline: 'poly8k',
        distanceMeters: 8000,
        centerLat: 48.0,
        centerLng: 2.0,
        radiusMeters: 3000,
        type: RouteType.ROUTE,
      },
    });

    const src = await prisma.event.create({
      data: {
        organiserId: organiserFree.id,
        title: 'Sortie passée',
        description: 'desc',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: `DUP${Math.floor(Math.random() * 900 + 100)}`,
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: src.id, userId: organiserFree.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: src.id, userId: otherUser.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
      ],
    });

    const er1 = await prisma.eventRoute.create({
      data: {
        eventId: src.id,
        routeId: libRoute.id,
        name: 'Parcours A',
        distanceMeters: 8000,
        type: RouteType.ROUTE,
        encodedPolyline: 'polyA',
      },
    });

    const [g1, g2] = await Promise.all([
      prisma.eventGroup.create({ data: { eventRouteId: er1.id, label: '10-11', paceMinKmh: 10, paceMaxKmh: 11 } }),
      prisma.eventGroup.create({ data: { eventRouteId: er1.id, label: '12+', paceMinKmh: 12, paceMaxKmh: null } }),
    ]);

    return { src, libRoute, er1, g1, g2 };
  }

  it('201 duplique routes sans groupes (default), sans participants (sauf organisateur), et renvoie shape détaillé', async () => {
    const { src, libRoute } = await seedCompletedEventWith1Route2Groups();

    const res = await request(app.getHttpServer())
      .post(`/events/${src.id}/duplicate`)
      .set('Authorization', `Bearer ${organiserFreeToken}`)
      .send({ startDateTime: '2030-01-08T10:00:00.000Z' })
      .expect(201);

    expect(res.body).toHaveProperty('event');
    const newEventId = res.body.event.id;

    const newRoutes = await prisma.eventRoute.findMany({ where: { eventId: newEventId } });
    expect(newRoutes).toHaveLength(1);
    expect(newRoutes[0].routeId).toBe(libRoute.id);

    const newGroups = await prisma.eventGroup.findMany({ where: { eventRoute: { eventId: newEventId } } });
    expect(newGroups).toHaveLength(0);

    const newParticipants = await prisma.eventParticipant.findMany({ where: { eventId: newEventId } });
    expect(newParticipants).toHaveLength(1);
    expect(newParticipants[0].userId).toBe(organiserFree.id);
    expect(newParticipants[0].role).toBe(RoleInEvent.ORGANISER);
  });

  it('201 duplique routes + 1 groupe (SELECT groupIds)', async () => {
    const { src, g1 } = await seedCompletedEventWith1Route2Groups();

    const res = await request(app.getHttpServer())
      .post(`/events/${src.id}/duplicate`)
      .set('Authorization', `Bearer ${organiserFreeToken}`)
      .send({ startDateTime: '2030-01-09T10:00:00.000Z', groupIds: [g1.id] })
      .expect(201);

    const newEventId = res.body.event.id;

    const newGroups = await prisma.eventGroup.findMany({
      where: { eventRoute: { eventId: newEventId } },
      orderBy: { createdAt: 'asc' },
    });

    expect(newGroups).toHaveLength(1);
    expect(newGroups[0].label).toBe('10-11');
  });

  it('201 duplique routes + tous les groupes (copyAllGroups=true)', async () => {
    const { src } = await seedCompletedEventWith1Route2Groups();

    const res = await request(app.getHttpServer())
      .post(`/events/${src.id}/duplicate`)
      .set('Authorization', `Bearer ${organiserFreeToken}`)
      .send({ startDateTime: '2030-01-10T10:00:00.000Z', copyAllGroups: true })
      .expect(201);

    const newEventId = res.body.event.id;

    const newGroups = await prisma.eventGroup.findMany({
      where: { eventRoute: { eventId: newEventId } },
    });

    expect(newGroups).toHaveLength(2);
    const labels = newGroups.map((g) => g.label).sort();
    expect(labels).toEqual(['10-11', '12+'].sort());
  });
});
