import { Module } from '@nestjs/common';
import { EventParticipantsService } from './event-participants.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';

@Module({
  imports: [],
  providers: [EventParticipantsService, PrismaService],
  exports: [EventParticipantsService],
})
export class EventParticipantsModule { }
