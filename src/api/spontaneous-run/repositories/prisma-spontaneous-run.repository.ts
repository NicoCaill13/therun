import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import type { SpontaneousRun } from '../domain/spontaneous-run';
import {
  SpontaneousRunMapper,
  type SpontaneousRunPersistenceRow,
} from '../mappers/spontaneous-run.mapper';
import type {
  CreateSpontaneousRunData,
  SpontaneousRunRepository,
  UpdateSpontaneousRunData,
} from './spontaneous-run.repository';

@Injectable()
export class PrismaSpontaneousRunRepository implements SpontaneousRunRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: SpontaneousRunMapper,
  ) {}

  async create(data: CreateSpontaneousRunData): Promise<SpontaneousRun> {
    const row = await this.prisma.spontaneousRun.create({ data });
    return this.mapper.toDomain(row as SpontaneousRunPersistenceRow);
  }

  async findAll(): Promise<SpontaneousRun[]> {
    const rows = await this.prisma.spontaneousRun.findMany({
      orderBy: { startTime: 'asc' },
    });
    return rows.map((row) =>
      this.mapper.toDomain(row as SpontaneousRunPersistenceRow),
    );
  }

  async findById(id: string): Promise<SpontaneousRun | null> {
    const row = await this.prisma.spontaneousRun.findUnique({ where: { id } });
    return row
      ? this.mapper.toDomain(row as SpontaneousRunPersistenceRow)
      : null;
  }

  async update(
    id: string,
    data: UpdateSpontaneousRunData,
  ): Promise<SpontaneousRun> {
    const row = await this.prisma.spontaneousRun.update({
      where: { id },
      data,
    });
    return this.mapper.toDomain(row as SpontaneousRunPersistenceRow);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.spontaneousRun.delete({ where: { id } });
  }
}
