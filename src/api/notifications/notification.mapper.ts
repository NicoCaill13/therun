import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationDto } from './dto/notification.dto';
import { toIsoString } from '@/common/utils/date.util';

@Injectable()
export class NotificationMapper {
  toDto(notification: Notification): NotificationDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      eventId: notification.eventId ?? null,
      data: notification.data ?? null,
      createdAt: toIsoString(notification.createdAt)!,
      readAt: toIsoString(notification.readAt),
    };
  }
}
