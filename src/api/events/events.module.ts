import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UsersModule } from '@/api/users/users.module';
import { EventParticipantsModule } from '@/api/event-participants/event-participants.module';
import { EventRoutesModule } from '../event-routes/event-routes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsPublicController } from './events.public.controller';

@Module({
  imports: [UsersModule, EventParticipantsModule, EventRoutesModule, NotificationsModule],
  controllers: [EventsController, EventsPublicController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
