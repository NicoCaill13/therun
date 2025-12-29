import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, makeJwtToken, seedUser } from '../e2e-utils';
import { EventParticipantStatus, EventStatus, RoleInEvent, UserPlan } from '@prisma/client';

describe('S7.1.2 — GET /me/events (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: any;

  let organiser: any;
  let organiserToken: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', email: 'org7@mail.com' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).get('/me/events?scope=future').expect(401);
  });

  it('future: PLANNED + startDateTime > now, tri asc, goingCount = count GOING', async () => {
    const e1 = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'F1',
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'E7F001',
      },
    });

    const e2 = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'F2',
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'E7F002',
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: e1.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: e1.id, userId: null, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING }, // guest-like
        { eventId: e2.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/me/events?scope=future&page=1&pageSize=20')
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    expect(res.body.total).toBeGreaterThanOrEqual(2);

    const items = res.body.items.filter((x: any) => x.id === e1.id || x.id === e2.id);
    expect(items).toHaveLength(2);

    // tri asc
    expect(items[0].id).toBe(e1.id);
    expect(items[1].id).toBe(e2.id);

    const i1 = items.find((x: any) => x.id === e1.id);
    const i2 = items.find((x: any) => x.id === e2.id);

    expect(i1.goingCount).toBe(2);
    expect(i2.goingCount).toBe(1);
  });

  it('past: COMPLETED tri desc, goingCount utilise snapshot si présent sinon fallback count', async () => {
    const completedWithSnapshot = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'P1',
        startDateTime: new Date('2025-01-01T10:00:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: 'E7P001',
        goingCountAtCompletion: 5, // ✅ snapshot
      },
    });

    const completedNoSnapshot = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'P2',
        startDateTime: new Date('2025-02-01T10:00:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: 'E7P002',
        goingCountAtCompletion: null,
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: completedWithSnapshot.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: completedWithSnapshot.id, userId: null, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: completedNoSnapshot.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/me/events?scope=past&page=1&pageSize=20')
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    const items = res.body.items.filter((x: any) => x.id === completedWithSnapshot.id || x.id === completedNoSnapshot.id);
    expect(items).toHaveLength(2);

    // tri desc => P2 (2025-02-01) avant P1 (2025-01-01)
    expect(items[0].id).toBe(completedNoSnapshot.id);
    expect(items[1].id).toBe(completedWithSnapshot.id);

    const p1 = items.find((x: any) => x.id === completedWithSnapshot.id);
    const p2 = items.find((x: any) => x.id === completedNoSnapshot.id);

    // snapshot gagne sur le count (2 GOING en DB mais snapshot=5)
    expect(p1.goingCount).toBe(5);

    // fallback count GOING (1)
    expect(p2.goingCount).toBe(1);
  });

  it('cancelled: CANCELLED tri desc', async () => {
    const c1 = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'C1',
        startDateTime: new Date('2025-03-01T10:00:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'E7C001',
      },
    });

    const c2 = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'C2',
        startDateTime: new Date('2025-04-01T10:00:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'E7C002',
      },
    });

    const res = await request(app.getHttpServer())
      .get('/me/events?scope=cancelled&page=1&pageSize=20')
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    const items = res.body.items.filter((x: any) => x.id === c1.id || x.id === c2.id);
    expect(items).toHaveLength(2);

    // tri desc => c2 avant c1
    expect(items[0].id).toBe(c2.id);
    expect(items[1].id).toBe(c1.id);
  });
});
