import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@/prisma/client';
import type { SpontaneousRun } from './domain/spontaneous-run';
import {
  SPONTANEOUS_RUN_REPOSITORY,
  type SpontaneousRunRepository,
} from './repositories/spontaneous-run.repository';
import { SpontaneousRunService } from './spontaneous-run.service';

const baseRun = (): SpontaneousRun => ({
  id: 'run_1',
  creatorId: 'user_1',
  locationName: 'Place Morgan',
  latitude: 45.5,
  longitude: -73.6,
  startTime: new Date('2026-05-06T18:00:00.000Z'),
  maxParticipants: 15,
  vibe: 'Chill',
  createdAt: new Date('2026-05-06T12:00:00.000Z'),
});

describe('SpontaneousRunService', () => {
  let service: SpontaneousRunService;
  let repository: jest.Mocked<SpontaneousRunRepository>;

  beforeEach(async () => {
    const mockRepo: jest.Mocked<SpontaneousRunRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpontaneousRunService,
        { provide: SPONTANEOUS_RUN_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(SpontaneousRunService);
    repository = module.get(SPONTANEOUS_RUN_REPOSITORY);
  });

  it('create persists default maxParticipants', async () => {
    repository.create.mockResolvedValue(baseRun());
    const dto = {
      creatorId: 'user_1',
      locationName: 'Place Morgan',
      latitude: 45.5,
      longitude: -73.6,
      startTime: '2026-05-06T18:00:00.000Z',
      vibe: 'Chill',
    };
    const res = await service.create(dto);
    expect(repository.create).toHaveBeenCalledWith({
      creatorId: 'user_1',
      locationName: 'Place Morgan',
      latitude: 45.5,
      longitude: -73.6,
      startTime: new Date('2026-05-06T18:00:00.000Z'),
      maxParticipants: 15,
      vibe: 'Chill',
    });
    expect(res.id).toBe('run_1');
    expect(res.startTime).toBe('2026-05-06T18:00:00.000Z');
  });

  it('create maps P2003 to BadRequestException', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('FK', {
      code: 'P2003',
      clientVersion: 'test',
    });
    repository.create.mockRejectedValue(err);
    await expect(
      service.create({
        creatorId: 'missing',
        locationName: 'X',
        latitude: 0,
        longitude: 0,
        startTime: '2026-05-06T18:00:00.000Z',
        vibe: 'Chill',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findOne throws when missing', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update with empty body returns existing', async () => {
    repository.findById.mockResolvedValue(baseRun());
    const res = await service.update('run_1', {});
    expect(repository.update).not.toHaveBeenCalled();
    expect(res.id).toBe('run_1');
  });

  it('remove maps P2025 to NotFoundException', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    repository.delete.mockRejectedValue(err);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
