import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteDto } from './dto/route.dto';
import { UserPlan, Route } from '@prisma/client';
import { computeCenterAndRadius, computeDistanceMeters, decodePolyline } from '@/utils/polyline.util';
import { JwtUser } from '@/types/jwt';
import { RouteListResponseDto } from './dto/route-list.dto';
import { ListRoutesQueryDto } from './dto/list-routes-query.dto';
import { SuggestRoutesQueryDto } from './dto/suggest-routes-query.dto';
import { SuggestRoutesResponseDto } from './dto/suggest-routes-response.dto';
import { metersToLatDelta, metersToLngDelta, computeBoundingBox, haversineMeters } from '@/common/utils/geo.util';
import { normalizePagination, computePaginationMeta } from '@/common/utils/pagination.util';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/common/constants/pagination.constants';

@Injectable()
export class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

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

  private toDto(route: Route): RouteDto {
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

  async listRoutes(user: JwtUser, query: ListRoutesQueryDto): Promise<RouteListResponseDto> {
    const hasGeoFilter = typeof query.lat === 'number' || typeof query.lng === 'number' || typeof query.radiusMeters === 'number';
    const hasDistanceFilter = typeof query.distanceMin === 'number' || typeof query.distanceMax === 'number';
    const hasAnySearchFilter = hasGeoFilter || hasDistanceFilter;

    if (!query.createdBy && !hasAnySearchFilter) {
      throw new BadRequestException(['createdBy is required']);
    }

    const pagination = normalizePagination(query);

    // Enforce MAX_PAGE_SIZE for this endpoint (routes endpoint has stricter validation)
    if (pagination.pageSize >= MAX_PAGE_SIZE) {
      pagination.pageSize = DEFAULT_PAGE_SIZE;
      pagination.skip = (pagination.page - 1) * pagination.pageSize;
    }

    const where: {
      ownerId?: string;
      distanceMeters?: { gte?: number; lte?: number };
      centerLat?: { gte: number; lte: number };
      centerLng?: { gte: number; lte: number };
    } = {};

    const restrictToMe = user.plan !== UserPlan.PREMIUM || query.createdBy === 'me';
    if (restrictToMe) {
      where.ownerId = user.userId;
    }

    if (typeof query.distanceMin === 'number' || typeof query.distanceMax === 'number') {
      where.distanceMeters = {};
      if (typeof query.distanceMin === 'number') where.distanceMeters.gte = query.distanceMin;
      if (typeof query.distanceMax === 'number') where.distanceMeters.lte = query.distanceMax;
    }

    if (
      typeof query.lat === 'number' &&
      typeof query.lng === 'number' &&
      typeof query.radiusMeters === 'number' &&
      query.radiusMeters > 0
    ) {
      const dLat = metersToLatDelta(query.radiusMeters);
      const dLng = metersToLngDelta(query.radiusMeters, query.lat);

      where.centerLat = { gte: query.lat - dLat, lte: query.lat + dLat };
      where.centerLng = { gte: query.lng - dLng, lte: query.lng + dLng };
    }

    const [totalCount, routes] = await Promise.all([
      this.prisma.route.count({ where }),
      this.prisma.route.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    const meta = computePaginationMeta(totalCount, pagination);

    return {
      items: routes.map((r) => this.toDto(r)),
      ...meta,
    };
  }

  async suggestRoutes(user: JwtUser, q: SuggestRoutesQueryDto): Promise<SuggestRoutesResponseDto> {
    const limit = q.limit ?? 5;
    const radiusMeters = q.radiusMeters ?? 5000;
    const tolerancePct = q.tolerancePct ?? 0.2;

    const minDistance = Math.floor(q.distanceMeters * (1 - tolerancePct));
    const maxDistance = Math.ceil(q.distanceMeters * (1 + tolerancePct));

    // Bounding box (perf): réduit le scope avant calcul haversine
    const bbox = computeBoundingBox(q.lat, q.lng, radiusMeters);

    // On prend plus large que limit pour trier ensuite
    const prefetch = Math.min(100, Math.max(20, limit * 10));

    const candidates = await this.prisma.route.findMany({
      where: {
        ownerId: user.userId,
        distanceMeters: { gte: minDistance, lte: maxDistance },
        centerLat: { gte: bbox.latMin, lte: bbox.latMax },
        centerLng: { gte: bbox.lngMin, lte: bbox.lngMax },
      },
      take: prefetch,
      orderBy: { createdAt: 'desc' },
    });

    const scored = candidates
      .map((r) => {
        const distanceFromStartMeters = haversineMeters(q.lat, q.lng, r.centerLat, r.centerLng);
        const distanceDelta = Math.abs(r.distanceMeters - q.distanceMeters);

        return { route: r, distanceFromStartMeters, distanceDelta };
      })
      .filter((x) => x.distanceFromStartMeters <= radiusMeters)
      .sort((a, b) => {
        if (a.distanceFromStartMeters !== b.distanceFromStartMeters) {
          return a.distanceFromStartMeters - b.distanceFromStartMeters;
        }
        return a.distanceDelta - b.distanceDelta;
      })
      .slice(0, limit);

    return {
      items: scored.map(({ route, distanceFromStartMeters }) => ({
        routeId: route.id,
        name: route.name,
        distanceMeters: route.distanceMeters,
        type: route.type ?? null,
        centerLat: route.centerLat,
        centerLng: route.centerLng,
        radiusMeters: route.radiusMeters,
        encodedPolyline: route.encodedPolyline,
        distanceFromStartMeters,
      })),
    };
  }
}
