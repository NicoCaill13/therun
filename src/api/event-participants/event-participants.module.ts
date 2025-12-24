import { Module } from '@nestjs/common';
import { EventParticipantsService } from './event-participants.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [EventParticipantsService, PrismaService],
  exports: [EventParticipantsService],
})
export class EventParticipantsModule { }
