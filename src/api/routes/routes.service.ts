import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteDto } from './dto/route.dto';
import { UserPlan } from '@prisma/client';
import { computeCenterAndRadius, computeDistanceMeters, decodePolyline } from '@/utils/polyline.util';
import { JwtUser } from '@/types/jwt';
import { RouteListResponseDto } from './dto/route-list.dto';
import { ListRoutesQueryDto } from './dto/list-routes-query.dto';
import { SuggestRoutesQueryDto } from './dto/suggest-routes-query.dto';
import { SuggestRoutesResponseDto } from './dto/suggest-routes-response.dto';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) { }

  async createRoute(user: JwtUser, dto: CreateRouteDto): Promise<RouteDto> {
    if (!dto.encodedPolyline) {
      throw new BadRequestException('encodedPolyline is required');
    }

    const points = decodePolyline(dto.encodedPolyline);
    if (points.length < 2) {
      throw new BadRequestException('encodedPolyline must contain at least 2 points');
    }

    const distanceMeters = computeDistanceMeters(points);
    const { centerLat, centerLng, radiusMeters } = computeCenterAndRadius(points);

    const route = await this.prisma.route.create({
      data: {
        ownerId: user.userId,
        name: dto.name || 'Mon parcours',
        encodedPolyline: dto.encodedPolyline,
        distanceMeters,
        centerLat,
        centerLng,
        radiusMeters,
        type: dto.type ?? null,
      },
    });

    return this.toDto(route);
  }

  async getRouteById(routeId: string, user: JwtUser): Promise<RouteDto> {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Règle simple : détail accessible au propriétaire, aux PREMIUM, ou à un admin
    const isPremium = user.plan === UserPlan.PREMIUM;
    const canView = route.ownerId === user.userId || isPremium;

    if (!canView) {
      throw new ForbiddenException('You are not allowed to view this route');
    }

    return this.toDto(route);
  }

  private toDto(route: any): RouteDto {
    return {
      id: route.id,
      ownerId: route.ownerId,
      name: route.name,
      encodedPolyline: route.encodedPolyline,
      distanceMeters: route.distanceMeters,
      centerLat: route.centerLat,
      centerLng: route.centerLng,
      radiusMeters: route.radiusMeters,
      type: route.type,
      createdAt: route.createdAt,
      updatedAt: route.updatedAt,
    };
  }

  async listRoutes(user: JwtUser, params: ListRoutesQueryDto): Promise<RouteListResponseDto> {
    const { createdBy, page: pageRaw, pageSize: pageSizeRaw } = params;
    if (!createdBy) {
      throw new BadRequestException('createdBy query param is required (ex: createdBy=me)');
    }

    if (createdBy !== 'me') {
      throw new BadRequestException('Only createdBy=me is supported for now');
    }

    const page = pageRaw && pageRaw > 0 ? pageRaw : 1;

    const pageSize = pageSizeRaw && pageSizeRaw > 0 && pageSizeRaw <= 100 ? pageSizeRaw : 20;

    const where = { ownerId: user.userId };

    const [totalCount, routes] = await this.prisma.$transaction([
      this.prisma.route.count({ where }),
      this.prisma.route.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return {
      items: routes.map((r) => this.toDto(r)),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  async suggestRoutes(user: JwtUser, q: SuggestRoutesQueryDto): Promise<SuggestRoutesResponseDto> {
    const limit = q.limit ?? 5;
    const radiusMeters = q.radiusMeters ?? 5000;
    const tolerancePct = q.tolerancePct ?? 0.2;

    const minDistance = Math.floor(q.distanceMeters * (1 - tolerancePct));
    const maxDistance = Math.ceil(q.distanceMeters * (1 + tolerancePct));

    // Bounding box (perf): réduit le scope avant calcul haversine
    const { latMin, latMax, lngMin, lngMax } = this.computeBoundingBox(q.lat, q.lng, radiusMeters);

    // On prend plus large que limit pour trier ensuite
    const prefetch = Math.min(100, Math.max(20, limit * 10));

    const candidates = await this.prisma.route.findMany({
      where: {
        ownerId: user.userId, // MVP: uniquement les routes du user
        distanceMeters: { gte: minDistance, lte: maxDistance },
        centerLat: { gte: latMin, lte: latMax },
        centerLng: { gte: lngMin, lte: lngMax },
      },
      take: prefetch,
      orderBy: { createdAt: 'desc' }, // stable; tri pertinence ensuite en JS
    });

    const scored = candidates
      .map((r) => {
        const distanceFromStartMeters = haversineMeters(q.lat, q.lng, r.centerLat, r.centerLng);
        const distanceDelta = Math.abs(r.distanceMeters - q.distanceMeters);

        return {
          r,
          distanceFromStartMeters,
          distanceDelta,
        };
      })
      // re-check rayon réel (bounding box peut inclure des points hors cercle)
      .filter((x) => x.distanceFromStartMeters <= radiusMeters)
      // tri pertinence: d'abord proximité start, puis proximité distance
      .sort((a, b) => {
        if (a.distanceFromStartMeters !== b.distanceFromStartMeters) {
          return a.distanceFromStartMeters - b.distanceFromStartMeters;
        }
        return a.distanceDelta - b.distanceDelta;
      })
      .slice(0, limit);

    return {
      items: scored.map(({ r, distanceFromStartMeters }) => ({
        routeId: r.id,
        name: r.name,
        distanceMeters: r.distanceMeters,
        type: r.type ?? null,
        centerLat: r.centerLat,
        centerLng: r.centerLng,
        radiusMeters: r.radiusMeters,
        encodedPolyline: r.encodedPolyline,
        distanceFromStartMeters,
      })),
    };
  }

  private computeBoundingBox(lat: number, lng: number, radiusMeters: number) {
    // approximations suffisantes pour 0–10km
    const metersPerDegLat = 111_320;
    const latDelta = radiusMeters / metersPerDegLat;
    const lngDelta = radiusMeters / (metersPerDegLat * Math.cos((lat * Math.PI) / 180));

    return {
      latMin: lat - latDelta,
      latMax: lat + latDelta,
      lngMin: lng - lngDelta,
      lngMax: lng + lngDelta,
    };
  }
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
