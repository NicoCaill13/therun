import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent, UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';

describe('JoinController – POST /join/:eventCode/participate (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let event: any;

  let user: any;
  let userToken: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await prisma.eventParticipant.deleteMany();
    await prisma.eventGroup.deleteMany();
    await prisma.eventRoute.deleteMany();
    await prisma.route.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    user = await seedUser(prisma, UserPlan.FREE, { firstName: 'User' });
    userToken = makeJwtToken(jwtService, user.id, user.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        title: 'Run du jeudi',
        startDateTime: new Date('2026-01-01T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: 'ABCD12',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).post(`/join/${event.eventCode}/participate`).send({}).expect(401);
  });

  it('404 si eventCode invalide', async () => {
    const res = await request(app.getHttpServer())
      .post('/join/ZZZZZZ/participate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(404);

    expect(res.body.message).toBe('Event not found');
  });

  it('200 + crée EventParticipant si absent (status GOING, role PARTICIPANT)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/join/${event.eventCode}/participate`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(200);

    expect(res.body).toMatchObject({
      eventId: event.id,
      userId: user.id,
      status: 'GOING',
      role: 'PARTICIPANT',
    });
    expect(res.body.participantId).toBeDefined();

    const inDb = await prisma.eventParticipant.findFirst({
      where: { eventId: event.id, userId: user.id },
    });

    expect(inDb).toBeTruthy();
    expect(inDb?.status).toBe(EventParticipantStatus.GOING);
    expect(inDb?.role).toBe(RoleInEvent.PARTICIPANT);
  });

  it('200 + update si déjà existant (DECLINED -> GOING) sans doublon', async () => {
    // force DECLINED
    await prisma.eventParticipant.updateMany({
      where: { eventId: event.id, userId: user.id },
      data: { status: EventParticipantStatus.DECLINED },
    });

    const beforeCount = await prisma.eventParticipant.count({
      where: { eventId: event.id, userId: user.id },
    });

    const res = await request(app.getHttpServer())
      .post('/join/abcd12/participate') // case-insensitive
      .set('Authorization', `Bearer ${userToken}`)
      .send({})
      .expect(200);

    expect(res.body.status).toBe('GOING');

    const afterCount = await prisma.eventParticipant.count({
      where: { eventId: event.id, userId: user.id },
    });

    expect(afterCount).toBe(beforeCount);

    const inDb = await prisma.eventParticipant.findFirst({
      where: { eventId: event.id, userId: user.id },
    });

    expect(inDb?.status).toBe(EventParticipantStatus.GOING);
  });
});
