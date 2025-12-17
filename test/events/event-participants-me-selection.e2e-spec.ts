import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent, UserPlan, EventStatus, RouteType } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventsController – PATCH /events/:eventId/participants/me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let user: any;
  let userToken: string;

  let event: any;
  let routeA: any;
  let routeB: any;
  let groupA1: any;
  let groupB1: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', lastName: 'One' });
    user = await seedUser(prisma, UserPlan.FREE, { firstName: 'Runner', lastName: 'Two' });
    userToken = makeJwtToken(jwtService, user.id, user.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Selection',
        description: null,
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        locationName: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
        eventCode: 'SEL001',
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

    groupA1 = await prisma.eventGroup.create({
      data: {
        eventRouteId: routeA.id,
        label: 'A - 10-11',
        paceMinKmh: 10,
        paceMaxKmh: 11,
      },
    });

    groupB1 = await prisma.eventGroup.create({
      data: {
        eventRouteId: routeB.id,
        label: 'B - 12+',
        paceMinKmh: 12,
        paceMaxKmh: null,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const patchMe = (eventId: string, token: string, body: any) =>
    request(app.getHttpServer()).patch(`/events/${eventId}/participants/me`).set('Authorization', `Bearer ${token}`).send(body);

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).patch(`/events/${event.id}/participants/me`).send({ eventRouteId: routeA.id }).expect(401);
  });

  it('400 si aucun champ fourni', async () => {
    const res = await patchMe(event.id, userToken, {}).expect(400);
    expect(String(res.body.message)).toContain('At least one of eventRouteId or eventGroupId must be provided');
  });

  it("404 si l'event n'existe pas", async () => {
    const res = await patchMe('evt-nope', userToken, { eventRouteId: routeA.id }).expect(404);
    expect(res.body.message).toBe('Event not found');
  });

  it('409 si aucun participant (doit RSVP avant)', async () => {
    await prisma.eventParticipant.deleteMany({ where: { eventId: event.id, userId: user.id } });

    const res = await patchMe(event.id, userToken, { eventRouteId: routeA.id }).expect(409);
    expect(res.body.message).toBe('You must RSVP before selecting a route/group');
  });

  it('404 si eventRouteId ne correspond pas à un EventRoute de cet event', async () => {
    await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: user.id,
        status: EventParticipantStatus.GOING,
        role: RoleInEvent.PARTICIPANT,
      },
    });

    const res = await patchMe(event.id, userToken, { eventRouteId: 'route-does-not-exist' }).expect(404);
    expect(res.body.message).toBe('EventRoute not found');
  });

  it('404 si eventGroupId invalide', async () => {
    const res = await patchMe(event.id, userToken, { eventGroupId: 'group-does-not-exist' }).expect(404);
    expect(res.body.message).toBe('EventGroup not found');
  });

  it('409 si group ne correspond pas à la route fournie', async () => {
    // routeA + groupB1 => conflict
    const res = await patchMe(event.id, userToken, { eventRouteId: routeA.id, eventGroupId: groupB1.id }).expect(409);
    expect(res.body.message).toBe('EventGroup does not belong to selected EventRoute');
  });

  it('409 si group fourni sans route alors que participant.eventRouteId est null', async () => {
    await prisma.eventParticipant.updateMany({
      where: { eventId: event.id, userId: user.id },
      data: { eventRouteId: null, eventGroupId: null },
    });

    const res = await patchMe(event.id, userToken, { eventGroupId: groupA1.id }).expect(409);
    expect(res.body.message).toBe('You must select a route before selecting a group');
  });

  it('409 si group fourni sans route mais incompatible avec participant.eventRouteId', async () => {
    // participant routeA, groupB1 => conflict
    await prisma.eventParticipant.updateMany({
      where: { eventId: event.id, userId: user.id },
      data: { eventRouteId: routeA.id, eventGroupId: null },
    });

    const res = await patchMe(event.id, userToken, { eventGroupId: groupB1.id }).expect(409);
    expect(res.body.message).toBe('EventGroup does not belong to selected EventRoute');
  });

  it('200 update route + group (cohérent)', async () => {
    const res = await patchMe(event.id, userToken, {
      eventRouteId: routeA.id,
      eventGroupId: groupA1.id,
    }).expect(200);

    expect(res.body).toMatchObject({
      userId: user.id,
      displayName: 'Runner Two',
      roleInEvent: 'PARTICIPANT',
      status: 'GOING',
      eventRouteId: routeA.id,
      eventGroupId: groupA1.id,
    });

    const inDb = await prisma.eventParticipant.findFirst({ where: { eventId: event.id, userId: user.id } });
    expect(inDb?.eventRouteId).toBe(routeA.id);
    expect(inDb?.eventGroupId).toBe(groupA1.id);
  });

  it('200 update group seul (route déjà set)', async () => {
    // routeB + groupB1 d'abord
    await patchMe(event.id, userToken, { eventRouteId: routeB.id, eventGroupId: groupB1.id }).expect(200);

    // puis group seul (même group) => ok
    const res = await patchMe(event.id, userToken, { eventGroupId: groupB1.id }).expect(200);
    expect(res.body.eventRouteId).toBe(routeB.id);
    expect(res.body.eventGroupId).toBe(groupB1.id);
  });

  it('200 si eventRouteId=null => eventGroupId auto null', async () => {
    // set routeA+groupA1
    await patchMe(event.id, userToken, { eventRouteId: routeA.id, eventGroupId: groupA1.id }).expect(200);

    const res = await patchMe(event.id, userToken, { eventRouteId: null }).expect(200);
    expect(res.body.eventRouteId).toBeNull();
    expect(res.body.eventGroupId).toBeNull();
  });

  it('200 permet de clear le group uniquement (eventGroupId=null)', async () => {
    await patchMe(event.id, userToken, { eventRouteId: routeA.id, eventGroupId: groupA1.id }).expect(200);
    const res = await patchMe(event.id, userToken, { eventGroupId: null }).expect(200);
    expect(res.body.eventRouteId).toBe(routeA.id);
    expect(res.body.eventGroupId).toBeNull();
  });
});
