import type { SpontaneousRun as SpontaneousRunRow } from '@/prisma/client';
import { SpontaneousRunMapper } from './spontaneous-run.mapper';

describe('SpontaneousRunMapper', () => {
  const mapper = new SpontaneousRunMapper();

  it('maps Prisma row to domain including status', () => {
    const row = {
      id: 'run_1',
      creatorId: 'user_1',
      locationName: 'Place Morgan',
      latitude: 45.5,
      longitude: -73.6,
      startTime: new Date('2026-05-06T18:00:00.000Z'),
      maxParticipants: 15,
      vibe: 'Chill',
      status: 'ACTIVE',
      createdAt: new Date('2026-05-06T12:00:00.000Z'),
    } satisfies SpontaneousRunRow;

    expect(mapper.toDomain(row)).toEqual({
      id: 'run_1',
      creatorId: 'user_1',
      locationName: 'Place Morgan',
      latitude: 45.5,
      longitude: -73.6,
      startTime: row.startTime,
      maxParticipants: 15,
      vibe: 'Chill',
      status: 'ACTIVE',
      createdAt: row.createdAt,
    });
  });
});
