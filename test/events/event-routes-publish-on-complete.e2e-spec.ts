import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';
import { EventStatus, UserPlan, RouteType } from '@prisma/client';

describe('S7.2.1 — Publish EventRoutes to Route library on COMPLETED (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: any;

  let organiser: any;
  let organiserToken: string;

  const COMPLETE = (eventId: string) => `/events/${eventId}/complete`;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', email: 'org-pub@mail.com' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);
  });
  afterAll(async () => {
    await app.close();
  });

  it('publie chaque EventRoute (routeId=null) en Route + link routeId, et reste idempotent', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Event publish routes',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'PUBL01',
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    const er = await prisma.eventRoute.create({
      data: {
        eventId: event.id,
        routeId: null,
        name: 'Boucle 8km',
        distanceMeters: 8000,
        type: RouteType.ROUTE,
        encodedPolyline: 'abcdEFGH', // MVP: on ne valide pas la polyline ici, juste non vide
      },
    });

    // Run #1: complete -> publish
    await request(app.getHttpServer()).patch(COMPLETE(event.id)).set('Authorization', `Bearer ${organiserToken}`).expect(200);

    const routeCount1 = await prisma.route.count({ where: { ownerId: organiser.id } });
    expect(routeCount1).toBe(1);

    const route = await prisma.route.findFirst({
      where: { ownerId: organiser.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(route).toBeTruthy();
    expect(route?.name).toBe('Boucle 8km');
    expect(route?.distanceMeters).toBe(8000);
    expect(route?.encodedPolyline).toBe('abcdEFGH');
    expect(route?.centerLat).toBeCloseTo(48.0);
    expect(route?.centerLng).toBeCloseTo(2.0);
    expect(route?.radiusMeters).toBeGreaterThan(0);

    const erAfter1 = await prisma.eventRoute.findUnique({ where: { id: er.id } });
    expect(erAfter1?.routeId).toBe(route?.id);

    // Run #2: idempotent -> pas de nouveau Route
    await request(app.getHttpServer()).patch(COMPLETE(event.id)).set('Authorization', `Bearer ${organiserToken}`).expect(200);

    const routeCount2 = await prisma.route.count({ where: { ownerId: organiser.id } });
    expect(routeCount2).toBe(1);

    const erAfter2 = await prisma.eventRoute.findUnique({ where: { id: er.id } });
    expect(erAfter2?.routeId).toBe(route?.id);
  });

  it('ne publie pas si event est CANCELLED (complete refuse) -> aucun Route créé', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Cancelled event',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'PUBL02',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    await prisma.eventRoute.create({
      data: {
        eventId: event.id,
        routeId: null,
        name: 'Should not publish',
        distanceMeters: 5000,
        type: RouteType.ROUTE,
        encodedPolyline: 'xxxxx',
      },
    });

    const beforeRoutes = await prisma.route.count({ where: { ownerId: organiser.id } });

    await request(app.getHttpServer()).patch(COMPLETE(event.id)).set('Authorization', `Bearer ${organiserToken}`).expect(400);

    const afterRoutes = await prisma.route.count({ where: { ownerId: organiser.id } });
    expect(afterRoutes).toBe(beforeRoutes);
  });
});
