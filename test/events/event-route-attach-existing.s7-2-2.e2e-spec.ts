// test/events/event-route-attach-existing.s7-2-2.e2e-spec.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';
import { EventStatus, RouteType, UserPlan } from '@prisma/client';

describe('S7.2.2 — POST /events/:eventId/routes (mode=ATTACH) (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;
  let otherUser: any;
  let otherUserToken: string;
  let premium: any;
  let premiumToken: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;
    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    premium = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    premiumToken = makeJwtToken(jwtService, premium.id, premium.email, UserPlan.PREMIUM);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).post('/events/evt_xxx/routes').send({ mode: 'ATTACH', routeId: 'rt_xxx' }).expect(401);
  });

  it('FREE organisateur -> 403 si la route n’est pas à lui', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Event free',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'S7AT01',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    const route = await prisma.route.create({
      data: {
        ownerId: otherUser.id,
        name: 'Other route',
        encodedPolyline: 'poly',
        distanceMeters: 8000,
        centerLat: 48.0,
        centerLng: 2.0,
        radiusMeters: 3000,
        type: RouteType.ROUTE,
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${event.id}/routes`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({ mode: 'ATTACH', routeId: route.id, name: 'Attach' })
      .expect(403);
  });

  it('PREMIUM organisateur -> 201 peut attacher une route globale (pas à lui)', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: premium.id,
        title: 'Event prem',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'S7AT02',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    const route = await prisma.route.create({
      data: {
        ownerId: otherUser.id,
        name: 'Global 8k',
        encodedPolyline: 'poly8k',
        distanceMeters: 8000,
        centerLat: 48.0,
        centerLng: 2.0,
        radiusMeters: 3000,
        type: RouteType.ROUTE,
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/events/${event.id}/routes`)
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ mode: 'ATTACH', routeId: route.id, name: 'Parcours attaché' })
      .expect(201);

    expect(res.body).toHaveProperty('eventId', event.id);
    expect(res.body).toHaveProperty('routeId', route.id);
    expect(res.body).toHaveProperty('name', 'Parcours attaché');
    expect(res.body).toHaveProperty('encodedPolyline', 'poly8k');
    expect(res.body).toHaveProperty('distanceMeters', 8000);
  });

  it('même PREMIUM -> 403 si pas organisateur de l’event', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Event orgX',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'S7AT03',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    const route = await prisma.route.create({
      data: {
        ownerId: premium.id,
        name: 'Prem route',
        encodedPolyline: 'ppp',
        distanceMeters: 9000,
        centerLat: 48.0,
        centerLng: 2.0,
        radiusMeters: 3000,
        type: RouteType.ROUTE,
      },
    });

    await request(app.getHttpServer())
      .post(`/events/${event.id}/routes`)
      .set('Authorization', `Bearer ${premiumToken}`)
      .send({ mode: 'ATTACH', routeId: route.id })
      .expect(403);
  });
});
