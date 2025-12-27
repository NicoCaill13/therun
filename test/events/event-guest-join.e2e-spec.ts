import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser } from '../e2e-utils';
import { EventParticipantStatus, EventStatus, RoleInEvent, UserPlan } from '@prisma/client';

describe('S6.1.2 — POST /public/events/:eventId/guest-join (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAll(prisma);
  });

  it('201 sans token — crée un user guest (email null) + participant GOING', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ABCDE7',
      },
    });

    const res = await request(app.getHttpServer()).post(`/public/events/${event.id}/guest-join`).send({ firstName: 'Guest' }).expect(201);

    expect(res.body.eventId).toBe(event.id);
    expect(res.body.userId).toBeTruthy();
    expect(res.body.participantId).toBeTruthy();
    expect(res.body.isGuest).toBe(true);

    const user = await prisma.user.findUnique({
      where: { id: res.body.userId },
      select: { isGuest: true, email: true, firstName: true },
    });

    expect(user?.isGuest).toBe(true);
    expect(user?.email).toBeNull();
    expect(user?.firstName).toBe('Guest');

    const participant = await prisma.eventParticipant.findUnique({
      where: { id: res.body.participantId },
      select: { status: true, role: true, eventId: true, userId: true },
    });

    expect(participant?.eventId).toBe(event.id);
    expect(participant?.userId).toBe(res.body.userId);
    expect(participant?.role).toBe(RoleInEvent.PARTICIPANT);
    expect(participant?.status).toBe(EventParticipantStatus.GOING);
  });

  it('201 — si email correspond à un user existant, ne crée pas de nouveau user, et crée la participation', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    const existing = await seedUser(prisma, UserPlan.FREE, { firstName: 'Ana', email: 'ana@example.com' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ABCDE7',
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/public/events/${event.id}/guest-join`)
      .send({ firstName: 'Ana', email: 'ana@example.com' })
      .expect(201);

    expect(res.body.userId).toBe(existing.id);

    const userCount = await prisma.user.count({ where: { email: 'ana@example.com' } });
    expect(userCount).toBe(1);

    const participant = await prisma.eventParticipant.findFirst({
      where: { eventId: event.id, userId: existing.id },
      select: { status: true, role: true },
    });

    expect(participant?.role).toBe(RoleInEvent.PARTICIPANT);
    expect(participant?.status).toBe(EventParticipantStatus.GOING);
  });

  it('idempotent — 2 appels avec le même email => 1 seule participation', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ABCDE7',
      },
    });

    const email = 'guest@example.com';

    const r1 = await request(app.getHttpServer())
      .post(`/public/events/${event.id}/guest-join`)
      .send({ firstName: 'G1', email })
      .expect(201);

    const r2 = await request(app.getHttpServer())
      .post(`/public/events/${event.id}/guest-join`)
      .send({ firstName: 'G1', email })
      .expect(201);

    expect(r2.body.userId).toBe(r1.body.userId);

    const participants = await prisma.eventParticipant.findMany({
      where: { eventId: event.id, userId: r1.body.userId },
      select: { id: true },
    });

    expect(participants).toHaveLength(1);
  });

  it('404 si event inexistant', async () => {
    await request(app.getHttpServer()).post('/public/events/evt_xxx/guest-join').send({ firstName: 'Guest' }).expect(404);
  });

  it('400 si event CANCELLED/COMPLETED', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const cancelled = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Annulée',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'CANCEL7',
      },
    });

    await request(app.getHttpServer()).post(`/public/events/${cancelled.id}/guest-join`).send({ firstName: 'Guest' }).expect(400);
  });

  it('400 si DTO invalide (firstName manquant)', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ABCDE7',
      },
    });

    await request(app.getHttpServer()).post(`/public/events/${event.id}/guest-join`).send({ email: 'x@y.com' }).expect(400);
  });
});
