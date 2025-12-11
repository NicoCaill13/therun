import { Module } from '@nestjs/common';
import { EventRoutesService } from './event-routes.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [RoutesModule],
  providers: [EventRoutesService, PrismaService],
  exports: [EventRoutesService],
})
export class EventRoutesModule { }
