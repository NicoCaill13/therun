import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationDto } from './dto/notification.dto';

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  eventId?: string | null;
  data?: any;
  dedupKey?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) { }

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

  async listForUser(userId: string, opts: { page?: number; pageSize?: number; unreadOnly?: boolean }) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;

    const where: any = {
      userId,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };

    const [unreadCount, totalCount, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return {
      items: rows.map((n) => this.toDto(n)),
      page,
      pageSize,
      totalCount,
      totalPages,
      unreadCount,
    };
  }

  private toDto(n: any): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      eventId: n.eventId ?? null,
      data: n.data ?? null,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt ? n.readAt.toISOString() : null,
    };
  }
}
