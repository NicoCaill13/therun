import { Injectable } from '@nestjs/common';
import type { SpontaneousRun as PrismaSpontaneousRun } from '@prisma/client';
import type { SpontaneousRun } from '../domain/spontaneous-run';

@Injectable()
export class SpontaneousRunMapper {
  toDomain(row: PrismaSpontaneousRun): SpontaneousRun {
    return {
      id: row.id,
      creatorId: row.creatorId,
      locationName: row.locationName,
      latitude: row.latitude,
      longitude: row.longitude,
      startTime: row.startTime,
      maxParticipants: row.maxParticipants,
      vibe: row.vibe,
      createdAt: row.createdAt,
    };
  }
}
