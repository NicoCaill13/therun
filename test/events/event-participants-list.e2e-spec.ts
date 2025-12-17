import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent, UserPlan, EventStatus, RouteType } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';

describe('EventsController – GET /events/:eventId/participants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;
  let otherUser: any;
  let otherUserToken: string;

  let event: any;
  let routeA: any;
  let groupA: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', lastName: 'One' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other', lastName: 'Guy' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'List Participants',
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        eventCode: 'LP001',
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

    groupA = await prisma.eventGroup.create({
      data: { eventRouteId: routeA.id, label: '10-11' },
    });

    const u1 = await seedUser(prisma, UserPlan.FREE, { firstName: 'A', lastName: 'Going' });
    const u2 = await seedUser(prisma, UserPlan.FREE, { firstName: 'B', lastName: 'Maybe' });
    const u3 = await seedUser(prisma, UserPlan.FREE, { firstName: 'C', lastName: 'Invited' });
    const u4 = await seedUser(prisma, UserPlan.FREE, { firstName: 'D', lastName: 'Declined' });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        {
          eventId: event.id,
          userId: u1.id,
          role: RoleInEvent.PARTICIPANT,
          status: EventParticipantStatus.GOING,
          eventRouteId: routeA.id,
          eventGroupId: groupA.id,
        },
        { eventId: event.id, userId: u2.id, role: RoleInEvent.ENCADRANT, status: EventParticipantStatus.MAYBE },
        { eventId: event.id, userId: u3.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
        { eventId: event.id, userId: u4.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.DECLINED },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).get(`/events/${event.id}/participants`).expect(401);
  });

  it("404 si event n'existe pas", async () => {
    const res = await request(app.getHttpServer())
      .get('/events/evt-nope/participants')
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(404);

    expect(res.body.message).toBe('Event not found');
  });

  it('403 si pas organisateur', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403);

    expect(res.body.message).toBe('Only organiser can view participants');
  });

  it('200 par défaut exclut DECLINED', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    const statuses = res.body.items.map((x: any) => x.status);
    expect(statuses.includes('DECLINED')).toBe(false);
  });

  it('400 si status invalide', async () => {
    await request(app.getHttpServer())
      .get(`/events/${event.id}/participants?status=DECLINED`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(400);
  });

  it('filtre status=INVITED', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants?status=INVITED`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    for (const it of res.body.items) expect(it.status).toBe('INVITED');
  });

  it('filtre eventRouteId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants?eventRouteId=${routeA.id}`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    for (const it of res.body.items) {
      expect(it.eventRoute?.id).toBe(routeA.id);
    }
  });

  it('pagination (page/pageSize)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/events/${event.id}/participants?page=1&pageSize=2`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(2);
    expect(res.body.items).toHaveLength(2);
  });
});
