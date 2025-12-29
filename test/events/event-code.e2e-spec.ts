// test/events/event-code.e2e-spec.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan, EventStatus } from '@prisma/client';
import { clearAll, createE2eApp, makeJwtToken, seedUser } from '../e2e-utils';
import { EventsService } from '@/api/events/events.service';

const CODE_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5,8}$/;

describe('S6.1.0 – EventCode auto (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventsService: EventsService;

  let organiser: any;
  let organiserToken: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    eventsService = app.get(EventsService);

    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    organiserToken = makeJwtToken(ctx.jwtService, organiser.id, organiser.email, UserPlan.FREE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .send({
        title: 'Run',
        startDateTime: new Date('2030-01-01T10:00:00.000Z').toISOString(),
      })
      .expect(401);
  });

  it('201 génère eventCode (5–8, alphabet restreint) et il est exposé dans GET /events/:id', async () => {
    // ⚠️ payload minimal pour éviter forbidNonWhitelisted
    const createRes = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({
        title: 'Sortie test code',
        startDateTime: new Date('2030-01-01T10:00:00.000Z').toISOString(),
        // si ton DTO accepte ces champs, garde-les, sinon retire-les
        locationName: 'Parc',
        locationAddress: 'Rue X',
      })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body).toHaveProperty('eventCode');
    expect(createRes.body.eventCode).toMatch(CODE_REGEX);

    const eventId = createRes.body.id;

    const getRes = await request(app.getHttpServer())
      .get(`/events/${eventId}`)
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    // ton getEventDetails renvoie { event: {...} }
    expect(getRes.body?.event?.eventCode).toBe(createRes.body.eventCode);
    expect(getRes.body?.event?.eventCode).toMatch(CODE_REGEX);
  });

  it('retry automatique en cas de collision (pas d’erreur visible)', async () => {
    // 1) on crée un event avec un code "connu" (valide)
    const existing = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Existing',
        startDateTime: new Date('2030-01-02T10:00:00.000Z'),
        status: EventStatus.PLANNED,
        locationName: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
        eventCode: 'ABCDE',
      },
    });
    expect(existing.eventCode).toBe('ABCDE');

    // 2) on force generateEventCode() à produire d'abord la collision, puis un code OK
    const original = (eventsService as any).generateEventCode;
    (eventsService as any).generateEventCode = jest
      .fn()
      .mockReturnValueOnce('ABCDE') // collision
      .mockReturnValueOnce('FGHJK'); // ok

    const res = await request(app.getHttpServer())
      .post('/events')
      .set('Authorization', `Bearer ${organiserToken}`)
      .send({
        title: 'Sortie collision',
        startDateTime: new Date('2030-01-02T12:00:00.000Z').toISOString(),
      })
      .expect(201);

    expect(res.body.eventCode).toBe('FGHJK');
    expect(res.body.eventCode).toMatch(CODE_REGEX);

    // restore
    (eventsService as any).generateEventCode = original;
  });
});
