import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventCodeService } from './event-code.service';
import { EventCompletionService } from './event-completion.service';
import { EventDuplicationService } from './event-duplication.service';
import { EventsController } from './events.controller';
import { EventParticipantsController, EventBroadcastController } from './event-participants.controller';
import { EventRoutesController } from './event-routes.controller';
import { UsersModule } from '@/api/users/users.module';
import { EventParticipantsModule } from '@/api/event-participants/event-participants.module';
import { EventRoutesModule } from '../event-routes/event-routes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsPublicController } from './events.public.controller';
import { AuthModule } from '@/infrastructure/auth/auth.module';

@Module({
  imports: [UsersModule, EventParticipantsModule, EventRoutesModule, NotificationsModule, AuthModule],
  controllers: [
    EventsController,
    EventParticipantsController,
    EventBroadcastController,
    EventRoutesController,
    EventsPublicController,
  ],
  providers: [EventsService, EventCodeService, EventCompletionService, EventDuplicationService],
  exports: [EventsService, EventCompletionService, EventDuplicationService],
})
export class EventsModule {}
