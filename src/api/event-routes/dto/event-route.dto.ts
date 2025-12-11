import { RouteType } from '@prisma/client';

export class EventRouteDto {
  id: string;
  eventId: string;
  routeId: string | null;
  name: string;
  distanceMeters: number;
  type: RouteType | null;
  encodedPolyline: string;
  createdAt: Date;
  updatedAt: Date;
}
