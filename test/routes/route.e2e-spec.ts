import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UserPlan, RouteType } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken, clearEventsAndRoutes } from '../e2e-utils';

describe('RoutesController – /routes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userFree: any;
  let userFreeToken: string;
  let userOtherFree: any;
  let otherUserToken: string;
  let premiumUser: any;
  let userPremiumToken: string;
  // Polyline de démo Google (3 points), distance > 0
  const TEST_POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

  const expectMessageContains = (message: any, needle: string) => {
    if (Array.isArray(message)) {
      expect(message.join(' | ')).toContain(needle);
      return;
    }
    expect(String(message)).toContain(needle);
  };

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearEventsAndRoutes(prisma);

    userFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });
    userFreeToken = makeJwtToken(jwtService, userFree.id, userFree.email, UserPlan.FREE);

    userOtherFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, userOtherFree.id, userOtherFree.email, UserPlan.FREE);

    premiumUser = await seedUser(prisma, UserPlan.PREMIUM, { firstName: 'Premium' });
    userPremiumToken = makeJwtToken(jwtService, premiumUser.id, premiumUser.email, UserPlan.PREMIUM);
  });

  afterAll(async () => {
    await app.close();
  });

  const clearRoutes = async () => {
    await prisma.route.deleteMany();
  };

  const createRoute = async (opts: { id?: string; ownerId: string; name: string; createdAt?: Date }) => {
    return prisma.route.create({
      data: {
        id: opts.id,
        ownerId: opts.ownerId,
        name: opts.name,
        encodedPolyline: TEST_POLYLINE,
        distanceMeters: 10000,
        centerLat: 43.3,
        centerLng: 5.4,
        radiusMeters: 1200,
        type: RouteType.ROUTE,
        createdAt: opts.createdAt,
      },
    });
  };

  describe('GET /routes?createdBy=me', () => {
    beforeEach(async () => {
      await clearRoutes();
    });

    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).get('/routes?createdBy=me').expect(401);
    });

    it('devrait renvoyer 400 si createdBy est manquant', async () => {
      const res = await request(app.getHttpServer()).get('/routes').set('Authorization', `Bearer ${userFreeToken}`).expect(400);

      expect(res.body.message).toBeDefined();
      expectMessageContains(res.body.message, 'createdBy');
    });

    it('devrait renvoyer 400 si createdBy != me', async () => {
      const res = await request(app.getHttpServer())
        .get('/routes?createdBy=all')
        .set('Authorization', `Bearer ${userFreeToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
      expectMessageContains(res.body.message, 'createdBy');
    });

    it("devrait renvoyer une liste vide si l'utilisateur n'a aucun parcours", async () => {
      const res = await request(app.getHttpServer())
        .get('/routes?createdBy=me&page=1&pageSize=20')
        .set('Authorization', `Bearer ${userFreeToken}`)
        .expect(200);

      expect(res.body).toMatchObject({
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
      });
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toHaveLength(0);
    });

    it('devrait retourner uniquement les routes du owner (ownerId = userId) + pagination', async () => {
      // 3 routes pour userFree (avec dates contrôlées)
      await createRoute({ ownerId: userFree.id, name: 'R1', createdAt: new Date('2025-01-01T10:00:00Z') });
      await createRoute({ ownerId: userFree.id, name: 'R2', createdAt: new Date('2025-01-02T10:00:00Z') });
      await createRoute({ ownerId: userFree.id, name: 'R3', createdAt: new Date('2025-01-03T10:00:00Z') });

      // 2 routes pour un autre user (ne doivent jamais sortir)
      await createRoute({ ownerId: userOtherFree.id, name: 'X1', createdAt: new Date('2025-01-04T10:00:00Z') });
      await createRoute({ ownerId: userOtherFree.id, name: 'X2', createdAt: new Date('2025-01-05T10:00:00Z') });

      const res = await request(app.getHttpServer())
        .get('/routes?createdBy=me&page=1&pageSize=2')
        .set('Authorization', `Bearer ${userFreeToken}`)
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(2);
      expect(res.body.totalCount).toBe(3);
      expect(res.body.totalPages).toBe(2);
      expect(res.body.items).toHaveLength(2);

      // tri DESC (R3 puis R2)
      expect(res.body.items[0].name).toBe('R3');
      expect(res.body.items[1].name).toBe('R2');

      // uniquement ownerId = userFree
      for (const it of res.body.items) {
        expect(it.ownerId).toBe(userFree.id);
      }
    });

    it('devrait valider page/pageSize 20 si > 100', async () => {
      const res = await request(app.getHttpServer())
        .get('/routes?createdBy=me&page=0&pageSize=200')
        .set('Authorization', `Bearer ${userFreeToken}`)
        .expect(200);

      expect(res.body.pageSize).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /routes/:routeId
  // ---------------------------------------------------------------------------
  describe('GET /routes/:routeId', () => {
    beforeEach(async () => {
      await clearRoutes();
    });

    it('devrait renvoyer 401 si aucun token n’est fourni', async () => {
      await request(app.getHttpServer()).get('/routes/route-1').expect(401);
    });

    it('devrait renvoyer 404 si la route n’existe pas', async () => {
      const res = await request(app.getHttpServer()).get('/routes/route-404').set('Authorization', `Bearer ${userFreeToken}`).expect(404);

      expect(res.body.message).toBe('Route not found');
    });

    it('devrait renvoyer 403 si FREE non owner tente de voir une route чужая', async () => {
      const route = await createRoute({ ownerId: userOtherFree.id, name: 'Route Other' });

      const res = await request(app.getHttpServer()).get(`/routes/${route.id}`).set('Authorization', `Bearer ${userFreeToken}`).expect(403);

      expect(res.body.message).toBe('You are not allowed to view this route');
    });

    it('devrait autoriser le owner à voir le détail', async () => {
      const route = await createRoute({ ownerId: userFree.id, name: 'My Route' });

      const res = await request(app.getHttpServer()).get(`/routes/${route.id}`).set('Authorization', `Bearer ${userFreeToken}`).expect(200);

      expect(res.body).toMatchObject({
        id: route.id,
        ownerId: userFree.id,
        name: 'My Route',
        encodedPolyline: TEST_POLYLINE,
        distanceMeters: 10000,
        type: 'ROUTE',
      });
    });

    it('devrait autoriser un PREMIUM non owner à voir le détail (règle actuelle)', async () => {
      const route = await createRoute({ ownerId: userOtherFree.id, name: 'Other Route' });

      const res = await request(app.getHttpServer())
        .get(`/routes/${route.id}`)
        .set('Authorization', `Bearer ${userPremiumToken}`)
        .expect(200);
      expect(res.body.id).toBe(route.id);
      expect(res.body.ownerId).toBe(userOtherFree.id);
      expect(res.body.name).toBe('Other Route');
    });
  });
});

describe('RoutesController – GET /routes/suggest (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userFree: any;
  let userFreeToken: string;
  let otherUser: any;
  // Polyline de démo Google (3 points), distance > 0
  const TEST_POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
  const START = { lat: 43.2965, lng: 5.3698 }; // Marseille
  const DEFAULT_TARGET = 8000;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await clearEventsAndRoutes(prisma);

    userFree = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });
    userFreeToken = makeJwtToken(jwtService, userFree.id, userFree.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
  });

  afterAll(async () => {
    await app.close();
  });

  const createRoute = async (opts: {
    ownerId: string;
    name: string;
    distanceMeters: number;
    centerLat: number;
    centerLng: number;
    radiusMeters?: number;
    type?: RouteType;
  }) => {
    return prisma.route.create({
      data: {
        ownerId: opts.ownerId,
        name: opts.name,
        encodedPolyline: TEST_POLYLINE,
        distanceMeters: opts.distanceMeters,
        centerLat: opts.centerLat,
        centerLng: opts.centerLng,
        radiusMeters: opts.radiusMeters ?? 1200,
        type: opts.type ?? RouteType.ROUTE,
      },
    });
  };

  const suggest = (token: string, query: Record<string, any>) => {
    const qs = new URLSearchParams(
      Object.entries(query).reduce((acc: Record<string, string>, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {}),
    ).toString();

    return request(app.getHttpServer()).get(`/routes/suggest?${qs}`).set('Authorization', `Bearer ${token}`);
  };

  describe('Validation / Auth', () => {
    beforeEach(async () => {
      await clearEventsAndRoutes(prisma);
    });

    it('401 si pas de token', async () => {
      await request(app.getHttpServer())
        .get(`/routes/suggest?lat=${START.lat}&lng=${START.lng}&distanceMeters=${DEFAULT_TARGET}`)
        .expect(401);
    });

    it('400 si lat manquant', async () => {
      const res = await suggest(userFreeToken, {
        lng: START.lng,
        distanceMeters: DEFAULT_TARGET,
      }).expect(400);

      // message array class-validator
      expect(res.body.message.join(' | ')).toContain('lat');
    });

    it('400 si distanceMeters <= 0', async () => {
      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: 0,
      }).expect(400);

      expect(res.body.message.join(' | ')).toContain('distanceMeters');
    });

    it('400 si limit > 10', async () => {
      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: DEFAULT_TARGET,
        limit: 50,
      }).expect(400);

      expect(res.body.message.join(' | ')).toContain('limit');
    });

    it('400 si tolerancePct hors [0..1]', async () => {
      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: DEFAULT_TARGET,
        tolerancePct: 2,
      }).expect(400);

      expect(res.body.message.join(' | ')).toContain('tolerancePct');
    });
  });

  describe('Filtering / Result', () => {
    beforeEach(async () => {
      await clearEventsAndRoutes(prisma);
    });

    it('200 + items=[] si aucun parcours ne matche', async () => {
      // aucune route en base
      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: DEFAULT_TARGET,
      }).expect(200);

      expect(res.body).toEqual({ items: [] });
    });

    it('ne suggère que les routes du user (ownerId=req.user.id)', async () => {
      // Route qui matche, mais appartient à otherUser (ne doit pas sortir)
      await createRoute({
        ownerId: otherUser.id,
        name: 'Other - near',
        distanceMeters: 8000,
        centerLat: START.lat,
        centerLng: START.lng,
      });

      // Route qui matche et appartient au userFree (doit sortir)
      const mine = await createRoute({
        ownerId: userFree.id,
        name: 'Mine - near',
        distanceMeters: 8200,
        centerLat: START.lat,
        centerLng: START.lng,
      });

      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: DEFAULT_TARGET,
      }).expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].routeId).toBe(mine.id);
      expect(res.body.items[0].name).toBe('Mine - near');
    });

    it('filtre sur la distance (tolerancePct) : exclut hors plage', async () => {
      // target=8000, tolerance=0.2 => [6400..9600]
      await createRoute({
        ownerId: userFree.id,
        name: 'Too short',
        distanceMeters: 5000,
        centerLat: START.lat,
        centerLng: START.lng,
      });

      const ok = await createRoute({
        ownerId: userFree.id,
        name: 'Ok distance',
        distanceMeters: 7000,
        centerLat: START.lat,
        centerLng: START.lng,
      });

      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: 8000,
        tolerancePct: 0.2,
      }).expect(200);

      expect(res.body.items.map((x: any) => x.routeId)).toEqual([ok.id]);
    });

    it('filtre sur le rayon (radiusMeters) : exclut les routes trop loin', async () => {
      const near = await createRoute({
        ownerId: userFree.id,
        name: 'Near',
        distanceMeters: 8000,
        centerLat: START.lat,
        centerLng: START.lng,
      });

      // ~11km au nord (≈ 0.1° lat ~ 11.1km), donc hors 5km
      await createRoute({
        ownerId: userFree.id,
        name: 'Far',
        distanceMeters: 8000,
        centerLat: START.lat + 0.1,
        centerLng: START.lng,
      });

      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: 8000,
        radiusMeters: 5000,
      }).expect(200);

      expect(res.body.items.map((x: any) => x.routeId)).toEqual([near.id]);
      expect(res.body.items[0].distanceFromStartMeters).toBeGreaterThanOrEqual(0);
    });

    it('respecte limit', async () => {
      await createRoute({ ownerId: userFree.id, name: 'R1', distanceMeters: 8000, centerLat: START.lat, centerLng: START.lng });
      await createRoute({ ownerId: userFree.id, name: 'R2', distanceMeters: 8100, centerLat: START.lat, centerLng: START.lng });
      await createRoute({ ownerId: userFree.id, name: 'R3', distanceMeters: 8200, centerLat: START.lat, centerLng: START.lng });

      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: 8000,
        limit: 2,
      }).expect(200);

      expect(res.body.items).toHaveLength(2);
    });

    it('tri: à distance égale du départ, le plus proche de la distance cible sort en premier', async () => {
      // Même centre => même distanceFromStartMeters (≈ 0)
      const bestDelta = await createRoute({
        ownerId: userFree.id,
        name: 'Delta small',
        distanceMeters: 8100, // delta 100
        centerLat: START.lat,
        centerLng: START.lng,
      });

      const worstDelta = await createRoute({
        ownerId: userFree.id,
        name: 'Delta big',
        distanceMeters: 9000, // delta 1000
        centerLat: START.lat,
        centerLng: START.lng,
      });

      const res = await suggest(userFreeToken, {
        lat: START.lat,
        lng: START.lng,
        distanceMeters: 8000,
        limit: 5,
      }).expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      expect(res.body.items[0].routeId).toBe(bestDelta.id);
      expect(res.body.items[1].routeId).toBe(worstDelta.id);
      expect(res.body.items[0].distanceFromStartMeters).toBeCloseTo(0, 1);
    });
  });
});
