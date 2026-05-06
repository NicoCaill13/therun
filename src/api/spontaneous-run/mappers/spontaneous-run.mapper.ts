import { Injectable } from '@nestjs/common';
import type { SpontaneousRun as SpontaneousRunRow } from '@/prisma/client';
import type { SpontaneousRun } from '../domain/spontaneous-run';

@Injectable()
export class SpontaneousRunMapper {
  toDomain(row: SpontaneousRunRow): SpontaneousRun {
    const domain: SpontaneousRun = {
      id: row.id,
      creatorId: row.creatorId,
      locationName: row.locationName,
      latitude: row.latitude,
      longitude: row.longitude,
      startTime: row.startTime,
      maxParticipants: row.maxParticipants,
      vibe: row.vibe,
      status: row.status,
      createdAt: row.createdAt,
    };
    return domain;
  }
}
