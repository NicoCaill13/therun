import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan } from '@prisma/client';
import { createE2eApp, seedUser } from '../e2e-utils';

describe('JoinController – GET /join/:eventCode (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let event: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;

    await prisma.eventParticipant.deleteMany();
    await prisma.eventGroup.deleteMany();
    await prisma.eventRoute.deleteMany();
    await prisma.route.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', lastName: 'One' });

    event = await prisma.event.create({
      data: {
        title: 'Run du jeudi',
        startDateTime: new Date('2026-01-01T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: 'ABCD12',
        locationName: 'Parc Borély',
        locationLat: 43.259,
        locationLng: 5.381,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('200 (public) + payload minimal (pas de participants)', async () => {
    const res = await request(app.getHttpServer()).get(`/join/${event.eventCode}`).expect(200);

    expect(res.body).toMatchObject({
      eventId: event.id,
      title: 'Run du jeudi',
      locationName: 'Parc Borély',
      organiserId: organiser.id,
      organiserFirstName: 'Org',
      organiserLastName: 'One',
    });

    // startDateTime présent
    expect(res.body.startDateTime).toBeDefined();

    // pas de données sensibles
    expect(res.body.participants).toBeUndefined();
    expect(res.body.routes).toBeUndefined();
    expect(res.body.eventCode).toBeUndefined();
  });

  it('404 si code invalide', async () => {
    const res = await request(app.getHttpServer()).get('/join/ZZZZZZ').expect(404);

    expect(res.body.message).toBe('Event not found');
  });

  it('résolution case-insensitive', async () => {
    const res = await request(app.getHttpServer()).get('/join/abcd12').expect(200);

    expect(res.body.eventId).toBe(event.id);
  });
});
