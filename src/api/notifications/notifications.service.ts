import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotificationType, Notification } from '@prisma/client';
import { NotificationDto } from './dto/notification.dto';
import { normalizePagination, computePaginationMeta, PaginationInput } from '@/common/utils/pagination.util';
import { toIsoString } from '@/common/utils/date.util';

import { Prisma } from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string | null;
  data?: Prisma.InputJsonValue;
  dedupKey?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOne(input: CreateNotificationInput): Promise<NotificationDto> {
    const notif = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        eventId: input.eventId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data ?? undefined,
        dedupKey: input.dedupKey ?? null,
      },
    });

    return this.toDto(notif);
  }

  /**
   * Bulk create. Idempotence comes from @@unique([userId, dedupKey]) + skipDuplicates.
   * If dedupKey is null -> duplicates are allowed (as expected).
   */
  async createMany(inputs: CreateNotificationInput[]): Promise<{ createdCount: number }> {
    if (inputs.length === 0) return { createdCount: 0 };

    const res = await this.prisma.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        eventId: i.eventId ?? null,
        type: i.type,
        title: i.title,
        body: i.body,
        data: i.data ?? undefined,
        dedupKey: i.dedupKey ?? null,
      })),
      skipDuplicates: true,
    });

    return { createdCount: res.count };
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const notif = await this.prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notif || notif.userId !== userId) throw new NotFoundException('Notification not found');

    if (notif.readAt) return this.toDto(notif);

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return this.toDto(updated);
  }

  async listForUser(userId: string, opts: PaginationInput & { unreadOnly?: boolean }) {
    const pagination = normalizePagination(opts);

    const where = {
      userId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };

    const [unreadCount, totalCount, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    const meta = computePaginationMeta(totalCount, pagination);

    return {
      items: rows.map((n) => this.toDto(n)),
      ...meta,
      unreadCount,
    };
  }

  private toDto(notification: Notification): NotificationDto {
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
