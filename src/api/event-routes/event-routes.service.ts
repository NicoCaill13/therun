// src/events/event-routes.service.ts
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { CreateEventRouteDto, EventRouteMode } from './dto/create-event-route.dto';
import { EventRouteDto } from './dto/event-route.dto';
import { UserPlan } from '@prisma/client';
import { JwtUser } from '@/types/jwt';
import { RoutesService } from '../routes/routes.service';

@Injectable()
export class EventRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routesService: RoutesService,
  ) { }

  async listByEvent(eventId: string): Promise<EventRouteDto[]> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const routes = await this.prisma.eventRoute.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });

    return routes.map((r) => this.toDto(r));
  }

  async addRouteToEvent(eventId: string, user: JwtUser, dto: CreateEventRouteDto): Promise<EventRouteDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== user.userId) {
      throw new ForbiddenException('Only organiser can manage routes for this event');
    }

    switch (dto.mode) {
      case EventRouteMode.NEW:
        return this.handleNew(eventId, user, dto);
      case EventRouteMode.ATTACH:
        return this.handleAttach(eventId, user, dto);
      case EventRouteMode.COPY:
        return this.handleCopy(eventId, user, dto);
      default:
        throw new BadRequestException('Unsupported mode');
    }
  }

  // mode = NEW → crée un Route + un EventRoute lié
  private async handleNew(eventId: string, user: JwtUser, dto: CreateEventRouteDto): Promise<EventRouteDto> {
    if (!dto.encodedPolyline) {
      throw new BadRequestException('encodedPolyline is required for mode NEW');
    }
    const encodedPolyline = dto.encodedPolyline;
    const route = await this.routesService.createRoute(user, {
      name: dto.name || `Parcours - ${eventId}`,
      encodedPolyline,
      type: dto.type,
    });

    const eventRoute = await this.prisma.eventRoute.create({
      data: {
        eventId,
        routeId: route.id,
        name: dto.name || 'Parcours principal',
        distanceMeters: route.distanceMeters,
        type: route.type ?? null,
        encodedPolyline: route.encodedPolyline,
      },
    });

    return this.toDto(eventRoute);
  }

  // mode = ATTACH → réutilise un Route existant
  private async handleAttach(eventId: string, user: JwtUser, dto: CreateEventRouteDto): Promise<EventRouteDto> {
    if (!dto.routeId) {
      throw new BadRequestException('routeId is required for mode ATTACH');
    }

    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const isPremium = user.plan === UserPlan.PREMIUM;
    const canUse = route.ownerId === user.userId || isPremium;

    if (!canUse) {
      throw new ForbiddenException('You are not allowed to use this route');
    }

    const eventRoute = await this.prisma.eventRoute.create({
      data: {
        eventId,
        routeId: route.id,
        name: dto.name || route.name,
        distanceMeters: route.distanceMeters,
        type: route.type ?? null,
        encodedPolyline: route.encodedPolyline,
      },
    });

    return this.toDto(eventRoute);
  }

  // mode = COPY → crée un nouveau Route (owner = user) + EventRoute lié
  private async handleCopy(eventId: string, user: JwtUser, dto: CreateEventRouteDto): Promise<EventRouteDto> {
    if (!dto.routeId) {
      throw new BadRequestException('routeId is required for mode COPY');
    }

    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    const isPremium = user.plan === UserPlan.PREMIUM;
    const canUse = route.ownerId === user.userId || isPremium;

    if (!canUse) {
      throw new ForbiddenException('You are not allowed to copy this route');
    }

    const newRoute = await this.prisma.route.create({
      data: {
        ownerId: user.userId,
        name: dto.name || `${route.name} (copie)`,
        encodedPolyline: route.encodedPolyline,
        distanceMeters: route.distanceMeters,
        centerLat: route.centerLat,
        centerLng: route.centerLng,
        radiusMeters: route.radiusMeters,
        type: route.type ?? null,
      },
    });

    const eventRoute = await this.prisma.eventRoute.create({
      data: {
        eventId,
        routeId: newRoute.id,
        name: dto.name || newRoute.name,
        distanceMeters: newRoute.distanceMeters,
        type: newRoute.type ?? null,
        encodedPolyline: newRoute.encodedPolyline,
      },
    });

    return this.toDto(eventRoute);
  }

  private toDto(entity: any): EventRouteDto {
    return {
      id: entity.id,
      eventId: entity.eventId,
      routeId: entity.routeId ?? null,
      name: entity.name,
      distanceMeters: entity.distanceMeters,
      type: entity.type,
      encodedPolyline: entity.encodedPolyline,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
