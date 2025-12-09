import { Module } from '@nestjs/common';
import { EventParticipantService } from './event-participant.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';

@Module({
  imports: [],
  providers: [EventParticipantService, PrismaService],
  exports: [EventParticipantService],
})
export class EventParticipantsModule { }
