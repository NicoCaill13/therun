import { Module } from '@nestjs/common';
import { LocationModule } from '@/api/location/location.module';
import { PushModule } from '@/api/push/push.module';
import { UserModule } from '@/api/user/user.module';
import { SpontaneousRunMapper } from './mappers/spontaneous-run.mapper';
import { PrismaSpontaneousRunRepository } from './repositories/prisma-spontaneous-run.repository';
import { SPONTANEOUS_RUN_REPOSITORY } from './repositories/spontaneous-run.repository';
import { RunRadarNotifier } from './run-radar-notifier';
import { SpontaneousRunController } from './spontaneous-run.controller';
import { SpontaneousRunService } from './spontaneous-run.service';

@Module({
  imports: [LocationModule, PushModule, UserModule],
  controllers: [SpontaneousRunController],
  providers: [
    SpontaneousRunService,
    RunRadarNotifier,
    SpontaneousRunMapper,
    {
      provide: SPONTANEOUS_RUN_REPOSITORY,
      useClass: PrismaSpontaneousRunRepository,
    },
  ],
  exports: [SpontaneousRunService],
})
export class SpontaneousRunModule {}
