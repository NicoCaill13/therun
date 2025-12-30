import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { createE2eApp, seedUser, makeJwtToken, clearAll } from '../e2e-utils';
import { EventStatus, UserPlan } from '@prisma/client';

describe('S7.1.1 — Complete event (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: any;

  let organiser: any;
  let organiserToken: string;

  let other: any;
  let otherToken: string;

  const COMPLETE_PATH = (eventId: string) => `/events/${eventId}/complete`;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    jwtService = ctx.jwtService;

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org', email: 'org@mail.com' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    other = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other', email: 'other@mail.com' });
    otherToken = makeJwtToken(jwtService, other.id, other.email, UserPlan.FREE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).patch(COMPLETE_PATH('evt_xxx')).expect(401);
  });

  it('404 si event inexistant', async () => {
    await request(app.getHttpServer()).patch(COMPLETE_PATH('evt_xxx')).set('Authorization', `Bearer ${organiserToken}`).expect(404);
  });

  it("403 si l'utilisateur n'est pas l'organisateur", async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Run',
        description: null,
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'CMP7001',
        locationName: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
      },
    });

    await request(app.getHttpServer()).patch(COMPLETE_PATH(event.id)).set('Authorization', `Bearer ${otherToken}`).expect(403);

    const inDb = await prisma.event.findUnique({ where: { id: event.id }, select: { status: true } });
    expect(inDb?.status).toBe(EventStatus.PLANNED);
  });

  it('200 marque COMPLETED + idempotent', async () => {
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Run to complete',
        description: null,
        startDateTime: new Date('2030-01-01T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'CMP7002',
        locationName: 'Parc',
        locationAddress: 'Rue X',
        locationLat: 48.0,
        locationLng: 2.0,
      },
    });

    // Run #1
    await request(app.getHttpServer()).patch(COMPLETE_PATH(event.id)).set('Authorization', `Bearer ${organiserToken}`).expect(200);

    const after1 = await prisma.event.findUnique({ where: { id: event.id }, select: { status: true } });
    expect(after1?.status).toBe(EventStatus.COMPLETED);

    // Run #2 (idempotence)
    await request(app.getHttpServer()).patch(COMPLETE_PATH(event.id)).set('Authorization', `Bearer ${organiserToken}`).expect(200);

    const after2 = await prisma.event.findUnique({ where: { id: event.id }, select: { status: true } });
    expect(after2?.status).toBe(EventStatus.COMPLETED);
  });
});
