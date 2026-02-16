import { Injectable } from '@nestjs/common';
import { Route } from '@prisma/client';
import { RouteDto } from './dto/route.dto';

@Injectable()
export class RouteMapper {
  toDto(route: Route): RouteDto {
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
