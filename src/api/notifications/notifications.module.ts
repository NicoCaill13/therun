import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationMapper } from './notification.mapper';

@Module({
  providers: [NotificationsService, NotificationMapper],
  exports: [NotificationsService, NotificationMapper],
})
export class NotificationsModule {}
