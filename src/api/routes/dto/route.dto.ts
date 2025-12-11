import { RouteType } from '@prisma/client';

export class RouteDto {
  id: string;
  ownerId: string;
  name: string;
  encodedPolyline: string;
  distanceMeters: number;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  type: RouteType | null;
  createdAt: Date;
  updatedAt: Date;
}
