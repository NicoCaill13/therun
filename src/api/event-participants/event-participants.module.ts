import { Module } from '@nestjs/common';
import { EventParticipantsService } from './event-participants.service';
import { EventParticipantMapper } from './event-participant.mapper';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [EventParticipantsService, EventParticipantMapper],
  exports: [EventParticipantsService, EventParticipantMapper],
})
export class EventParticipantsModule {}
