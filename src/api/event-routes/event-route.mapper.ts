import { Injectable } from '@nestjs/common';
import { EventRoute } from '@prisma/client';
import { EventRouteDto } from './dto/event-route.dto';

@Injectable()
export class EventRouteMapper {
  toDto(entity: EventRoute): EventRouteDto {
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
