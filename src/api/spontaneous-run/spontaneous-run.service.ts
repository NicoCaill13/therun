import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@/prisma/client';
import type { SpontaneousRun } from './domain/spontaneous-run';
import type { CreateSpontaneousRunDto } from './dto/create-spontaneous-run.dto';
import { SpontaneousRunResponseDto } from './dto/spontaneous-run-response.dto';
import type { UpdateSpontaneousRunDto } from './dto/update-spontaneous-run.dto';
import {
  SPONTANEOUS_RUN_REPOSITORY,
  type SpontaneousRunRepository,
  type UpdateSpontaneousRunData,
} from './repositories/spontaneous-run.repository';

@Injectable()
export class SpontaneousRunService {
  constructor(
    @Inject(SPONTANEOUS_RUN_REPOSITORY)
    private readonly repository: SpontaneousRunRepository,
  ) {}

  async create(dto: CreateSpontaneousRunDto): Promise<SpontaneousRunResponseDto> {
    const maxParticipants = dto.maxParticipants ?? 15;
    try {
      const run = await this.repository.create({
        creatorId: dto.creatorId,
        locationName: dto.locationName,
        latitude: dto.latitude,
        longitude: dto.longitude,
        startTime: new Date(dto.startTime),
        maxParticipants,
        vibe: dto.vibe,
      });
      return this.toResponse(run);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new BadRequestException(
          'creatorId must reference an existing user',
        );
      }
      throw e;
    }
  }

  async findAll(): Promise<SpontaneousRunResponseDto[]> {
    const runs = await this.repository.findAll();
    return runs.map((run) => this.toResponse(run));
  }

  async findOne(id: string): Promise<SpontaneousRunResponseDto> {
    const run = await this.repository.findById(id);
    if (!run) {
      throw new NotFoundException(`Spontaneous run ${id} not found`);
    }
    return this.toResponse(run);
  }

  async update(
    id: string,
    dto: UpdateSpontaneousRunDto,
  ): Promise<SpontaneousRunResponseDto> {
    const data = this.toUpdateData(dto);
    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }
    try {
      const run = await this.repository.update(id, data);
      return this.toResponse(run);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Spontaneous run ${id} not found`);
      }
      throw e;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Spontaneous run ${id} not found`);
      }
      throw e;
    }
  }

  private toUpdateData(dto: UpdateSpontaneousRunDto): UpdateSpontaneousRunData {
    const data: UpdateSpontaneousRunData = {};
    if (dto.locationName !== undefined) {
      data.locationName = dto.locationName;
    }
    if (dto.latitude !== undefined) {
      data.latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      data.longitude = dto.longitude;
    }
    if (dto.startTime !== undefined) {
      data.startTime = new Date(dto.startTime);
    }
    if (dto.maxParticipants !== undefined) {
      data.maxParticipants = dto.maxParticipants;
    }
    if (dto.vibe !== undefined) {
      data.vibe = dto.vibe;
    }
    return data;
  }

  private toResponse(run: SpontaneousRun): SpontaneousRunResponseDto {
    const dto = new SpontaneousRunResponseDto();
    dto.id = run.id;
    dto.creatorId = run.creatorId;
    dto.locationName = run.locationName;
    dto.latitude = run.latitude;
    dto.longitude = run.longitude;
    dto.startTime = run.startTime.toISOString();
    dto.maxParticipants = run.maxParticipants;
    dto.vibe = run.vibe;
    dto.createdAt = run.createdAt.toISOString();
    return dto;
  }
}
