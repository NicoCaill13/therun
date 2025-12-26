import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser } from '../e2e-utils';
import { EventStatus, UserPlan } from '@prisma/client';

describe('S6.1.1 — GET /public/events/by-code/:eventCode (e2e)', () => {
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

  it('200 sans token (endpoint public) + payload minimal', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', lastName: 'A' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie du midi',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ABCDE7',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    const res = await request(app.getHttpServer()).get(`/public/events/by-code/${event.eventCode}`).expect(200);

    expect(res.body).toMatchObject({
      id: event.id,
      eventCode: 'ABCDE7',
      title: 'Sortie du midi',
      status: EventStatus.PLANNED,
      locationName: 'Parc',
      locationAddress: 'Rue X',
      organiser: { firstName: 'Org', lastName: 'A' },
      join: { eventId: event.id, eventCode: 'ABCDE7' },
    });

    // pas de fuite
    expect(res.body.participants).toBeUndefined();
    expect(res.body.organiserId).toBeUndefined();
  });

  it('404 si eventCode inexistant', async () => {
    await request(app.getHttpServer()).get('/public/events/by-code/ZZZZZ9').expect(404);
  });

  it('404 si event CANCELLED', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Annulée',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'CANCEL7',
      },
    });

    await request(app.getHttpServer()).get(`/public/events/by-code/${event.eventCode}`).expect(404);
  });

  it('404 si event COMPLETED', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Finie',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: 'DONE77',
      },
    });

    await request(app.getHttpServer()).get(`/public/events/by-code/${event.eventCode}`).expect(404);
  });

  it('400 si eventCode vide (espaces)', async () => {
    await request(app.getHttpServer()).get('/public/events/by-code/%20%20').expect(400);
  });
});
