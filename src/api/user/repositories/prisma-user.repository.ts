import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { haversineDistanceKm } from '@/api/location/haversine';
import type {
  NearbyRunNotificationUser,
  UserRepository,
} from './user.repository';

/** Row shape for radar user query (explicit; Prisma client may lag schema in Docker). */
type NearbyUserSelectRow = {
  id: string;
  lastKnownLatitude: number | null;
  lastKnownLongitude: number | null;
  expoPushToken: string | null;
};

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateLastKnownLocation(
    userId: string,
    latitude: number,
    longitude: number,
    expoPushToken?: string | null,
  ): Promise<void> {
    // Cast: tolerate Prisma client generated before radar columns existed (stale node_modules volume).
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastKnownLatitude: latitude,
        lastKnownLongitude: longitude,
        ...(expoPushToken !== undefined
          ? { expoPushToken: expoPushToken ?? null }
          : {}),
      } as never,
    });
  }

  async findNearbyWithExpoTokens(
    excludeUserId: string,
    centerLatitude: number,
    centerLongitude: number,
    radiusKm: number,
  ): Promise<NearbyRunNotificationUser[]> {
    const latDelta = radiusKm / 111;
    const cosLat = Math.cos((centerLatitude * Math.PI) / 180);
    const safeCos = Math.max(Math.abs(cosLat), 0.2);
    const lngDelta = radiusKm / (111 * safeCos);

    const rows = (await this.prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        lastKnownLatitude: { not: null },
        lastKnownLongitude: { not: null },
        expoPushToken: { not: null },
        AND: [
          {
            lastKnownLatitude: {
              gte: centerLatitude - latDelta,
              lte: centerLatitude + latDelta,
            },
          },
          {
            lastKnownLongitude: {
              gte: centerLongitude - lngDelta,
              lte: centerLongitude + lngDelta,
            },
          },
        ],
      },
      select: {
        id: true,
        lastKnownLatitude: true,
        lastKnownLongitude: true,
        expoPushToken: true,
      },
    } as never)) as unknown as NearbyUserSelectRow[];

    const out: NearbyRunNotificationUser[] = [];
    for (const row of rows) {
      if (
        row.lastKnownLatitude === null ||
        row.lastKnownLongitude === null ||
        row.expoPushToken === null
      ) {
        continue;
      }
      const d = haversineDistanceKm(
        centerLatitude,
        centerLongitude,
        row.lastKnownLatitude,
        row.lastKnownLongitude,
      );
      if (d <= radiusKm) {
        out.push({ userId: row.id, expoPushToken: row.expoPushToken });
      }
    }
    return out;
  }
}
