import { Module } from '@nestjs/common';
import { SpontaneousRunMapper } from './mappers/spontaneous-run.mapper';
import { PrismaSpontaneousRunRepository } from './repositories/prisma-spontaneous-run.repository';
import { SPONTANEOUS_RUN_REPOSITORY } from './repositories/spontaneous-run.repository';
import { SpontaneousRunController } from './spontaneous-run.controller';
import { SpontaneousRunService } from './spontaneous-run.service';

@Module({
  controllers: [SpontaneousRunController],
  providers: [
    SpontaneousRunService,
    SpontaneousRunMapper,
    {
      provide: SPONTANEOUS_RUN_REPOSITORY,
      useClass: PrismaSpontaneousRunRepository,
    },
  ],
  exports: [SpontaneousRunService],
})
export class SpontaneousRunModule {}
