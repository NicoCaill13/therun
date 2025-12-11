import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteDto } from './dto/route.dto';
import { UserPlan } from '@prisma/client';
import { computeCenterAndRadius, computeDistanceMeters, decodePolyline } from '@/utils/polyline.util';
import { JwtUser } from '@/types/jwt';

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

  /**
   * GET /routes?createdBy=me
   * MVP : on ne supporte que ce filtre pour éviter d’exposer toutes les routes.
   */
  async listRoutes(user: JwtUser, createdBy?: string): Promise<RouteDto[]> {
    if (!createdBy) {
      throw new BadRequestException('createdBy query param is required (ex: createdBy=me)');
    }

    if (createdBy !== 'me') {
      // MVP : pas d’autre filtre exposé
      throw new BadRequestException('Only createdBy=me is supported for now');
    }

    const routes = await this.prisma.route.findMany({
      where: { ownerId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return routes.map((r) => this.toDto(r));
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
}
