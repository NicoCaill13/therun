import type { SpontaneousRun } from '../domain/spontaneous-run';

export const SPONTANEOUS_RUN_REPOSITORY = Symbol('SPONTANEOUS_RUN_REPOSITORY');

export type CreateSpontaneousRunData = {
  creatorId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startTime: Date;
  maxParticipants: number;
  vibe: string;
};

export type UpdateSpontaneousRunData = Partial<
  Omit<CreateSpontaneousRunData, 'creatorId'> & { status: string }
>;

export interface SpontaneousRunRepository {
  create(data: CreateSpontaneousRunData): Promise<SpontaneousRun>;
  findAll(): Promise<SpontaneousRun[]>;
  findById(id: string): Promise<SpontaneousRun | null>;
  update(id: string, data: UpdateSpontaneousRunData): Promise<SpontaneousRun>;
  delete(id: string): Promise<void>;
}
