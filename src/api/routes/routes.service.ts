import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteDto } from './dto/route.dto';
import { UserPlan } from '@prisma/client';
import { computeCenterAndRadius, computeDistanceMeters, decodePolyline } from '@/utils/polyline.util';
import { JwtUser } from '@/types/jwt';
import { RouteListResponseDto } from './dto/route-list.dto';
import { ListRoutesQueryDto } from './dto/list-routes-query.dto';

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
}
