// test/routes/routes-search.s7-2-2.e2e-spec.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';
import { RouteType, UserPlan } from '@prisma/client';

describe('S7.2.2 — GET /routes search (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;
  let organiserToken: string;
  let otherUser: any;
  let otherUserToken: string;
  let premium: any;
  let premiumToken: string;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;
    await clearAll(prisma);

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    organiserToken = makeJwtToken(jwtService, organiser.id, organiser.email, UserPlan.FREE);

    premium = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    premiumToken = makeJwtToken(jwtService, premium.id, premium.email, UserPlan.PREMIUM);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 si pas de token', async () => {
    await request(app.getHttpServer()).get('/routes?lat=48&lng=2&radiusMeters=5000&distanceMin=7000&distanceMax=9000').expect(401);
  });

  it('FREE: ne voit que ses routes même si d’autres routes matchent', async () => {
    await prisma.route.createMany({
      data: [
        {
          ownerId: organiser.id,
          name: 'Mine 8k',
          encodedPolyline: 'aaa',
          distanceMeters: 8000,
          centerLat: 48.0,
          centerLng: 2.0,
          radiusMeters: 3000,
          type: RouteType.ROUTE,
        },
        {
          ownerId: otherUser.id,
          name: 'Other 8k',
          encodedPolyline: 'bbb',
          distanceMeters: 8200,
          centerLat: 48.0005,
          centerLng: 2.0005,
          radiusMeters: 3000,
          type: RouteType.ROUTE,
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/routes?lat=48&lng=2&radiusMeters=5000&distanceMin=7000&distanceMax=9000&page=1&pageSize=50')
      .set('Authorization', `Bearer ${organiserToken}`)
      .expect(200);

    const names = res.body.items.map((x: any) => x.name);
    expect(names).toContain('Mine 8k');
    expect(names).not.toContain('Other 8k');
  });

  it('PREMIUM: voit global', async () => {
    const res = await request(app.getHttpServer())
      .get('/routes?lat=48&lng=2&radiusMeters=5000&distanceMin=7000&distanceMax=9000&page=1&pageSize=50')
      .set('Authorization', `Bearer ${premiumToken}`)
      .expect(200);

    const names = res.body.items.map((x: any) => x.name);
    expect(names).toContain('Mine 8k');
    expect(names).toContain('Other 8k');
  });

  it('createdBy=me force owner only même en PREMIUM', async () => {
    await prisma.route.create({
      data: {
        ownerId: premium.id,
        name: 'Prem route',
        encodedPolyline: 'ccc',
        distanceMeters: 8000,
        centerLat: 48.0,
        centerLng: 2.0,
        radiusMeters: 3000,
        type: RouteType.ROUTE,
      },
    });

    const res = await request(app.getHttpServer())
      .get('/routes?createdBy=me&lat=48&lng=2&radiusMeters=5000&distanceMin=7000&distanceMax=9000&page=1&pageSize=50')
      .set('Authorization', `Bearer ${premiumToken}`)
      .expect(200);

    const names = res.body.items.map((x: any) => x.name);
    expect(names).toContain('Prem route');
    expect(names).not.toContain('Mine 8k');
    expect(names).not.toContain('Other 8k');
  });
});
