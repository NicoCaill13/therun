import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UsersModule } from '@/api/users/users.module';
import { EventParticipantsModule } from '@/api/event-participants/event-participants.module';

@Module({
  imports: [UsersModule, EventParticipantsModule],
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule { }
