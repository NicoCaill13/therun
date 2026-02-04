import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { UsersModule } from '@/api/users/users.module';
import { EventParticipantsModule } from '@/api/event-participants/event-participants.module';
import { EventRoutesModule } from '../event-routes/event-routes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsPublicController } from './events.public.controller';
import { AuthModule } from '@/infrastructure/auth/auth.module';

@Module({
  imports: [UsersModule, EventParticipantsModule, EventRoutesModule, NotificationsModule, AuthModule],
  controllers: [EventsController, EventsPublicController],
  providers: [EventsService, PrismaService],
  exports: [EventsService],
})
export class EventsModule {}
