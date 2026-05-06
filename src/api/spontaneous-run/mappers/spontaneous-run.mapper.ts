import { Injectable } from '@nestjs/common';
import type { SpontaneousRun } from '../domain/spontaneous-run';

/**
 * Persistence row for spontaneous_runs. `status` is optional so mapping stays
 * valid if the generated Prisma client lags behind `schema.prisma` until
 * `prisma generate` is run (e.g. stale Docker node_modules volume).
 */
export type SpontaneousRunPersistenceRow = {
  id: string;
  creatorId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startTime: Date;
  maxParticipants: number;
  vibe: string;
  createdAt: Date;
  status?: string;
};

@Injectable()
export class SpontaneousRunMapper {
  toDomain(row: SpontaneousRunPersistenceRow): SpontaneousRun {
    const domain: SpontaneousRun = {
      id: row.id,
      creatorId: row.creatorId,
      locationName: row.locationName,
      latitude: row.latitude,
      longitude: row.longitude,
      startTime: row.startTime,
      maxParticipants: row.maxParticipants,
      vibe: row.vibe,
      status: row.status ?? 'ACTIVE',
      createdAt: row.createdAt,
    };
    return domain;
  }
}
