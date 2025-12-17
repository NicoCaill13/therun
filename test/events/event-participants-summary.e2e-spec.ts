import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent, UserPlan, EventStatus, RouteType } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventsController – GET /events/:eventId/participants/summary (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;
  let otherUser: any;
  let otherUserToken: string;

  let event: any;
  let routeA: any;
  let routeB: any;
  let groupA: any;
  let groupB: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Summary',
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        eventCode: 'SUM001',
      },
    });

    routeA = await prisma.eventRoute.create({
      data: {
        eventId: event.id,
        routeId: null,
        name: 'Route A',
        distanceMeters: 8000,
        type: RouteType.ROUTE,
        encodedPolyline: 'polyA',
      },
    });

    routeB = await prisma.eventRoute.create({
      data: {
        eventId: event.id,
        routeId: null,
        name: 'Route B',
        distanceMeters: 10000,
        type: RouteType.ROUTE,
        encodedPolyline: 'polyB',
      },
    });

    groupA = await prisma.eventGroup.create({ data: { eventRouteId: routeA.id, label: 'A-10' } });
    groupB = await prisma.eventGroup.create({ data: { eventRouteId: routeB.id, label: 'B-12' } });

    const uGoingA = await seedUser(prisma, UserPlan.FREE, { firstName: 'GA' });
    const uGoingB = await seedUser(prisma, UserPlan.FREE, { firstName: 'GB' });
    const uInv = await seedUser(prisma, UserPlan.FREE, { firstName: 'IV' });
    const uMaybe = await seedUser(prisma, UserPlan.FREE, { firstName: 'MB' });
    const uDecl = await seedUser(prisma, UserPlan.FREE, { firstName: 'DC' });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        {
          eventId: event.id,
          userId: uGoingA.id,
          role: RoleInEvent.PARTICIPANT,
          status: EventParticipantStatus.GOING,
          eventRouteId: routeA.id,
          eventGroupId: groupA.id,
        },
        {
          eventId: event.id,
          userId: uGoingB.id,
          role: RoleInEvent.PARTICIPANT,
          status: EventParticipantStatus.GOING,
          eventRouteId: routeB.id,
          eventGroupId: groupB.id,
        },
        { eventId: event.id, userId: uInv.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
        { eventId: event.id, userId: uMaybe.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.MAYBE },
        { eventId: event.id, userId: uDecl.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.DECLINED },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).get(`/events/${event.id}/participants/summary`).expect(401);
  });

  it("404 si event n'existe pas", async () => {
    const res = await request(app.getHttpServer())
      .get('/events/evt-nope/participants/summary')
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(404);

    expect(res.body.message).toBe('Event not found');
  });

  it('403 si pas organisateur', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants/summary`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403);

    expect(res.body.message).toBe('Only organiser can view participants');
  });

  it('200 retourne les counts + répartitions (GOING uniquement pour byRoute/byGroup)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants/summary`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    expect(res.body.goingCount).toBe(3); // organiser + 2 going
    expect(res.body.invitedCount).toBe(1);
    expect(res.body.maybeCount).toBe(1);

    // byRoute contient 2 routes
    expect(res.body.byRoute).toHaveLength(2);
    const a = res.body.byRoute.find((x: any) => x.eventRouteId === routeA.id);
    const b = res.body.byRoute.find((x: any) => x.eventRouteId === routeB.id);
    expect(a.goingCount).toBe(1);
    expect(b.goingCount).toBe(1);

    // byGroup contient 2 groups
    expect(res.body.byGroup).toHaveLength(2);
    const ga = res.body.byGroup.find((x: any) => x.eventGroupId === groupA.id);
    const gb = res.body.byGroup.find((x: any) => x.eventGroupId === groupB.id);
    expect(ga.goingCount).toBe(1);
    expect(gb.goingCount).toBe(1);
  });
});
