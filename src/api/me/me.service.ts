import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus } from '@prisma/client';
import { MeInvitationsQueryDto } from './dto/me-invitations-query.dto';
import { MeInvitationsResponseDto } from './dto/me-invitations-response.dto';
import { JwtUser } from '@/types/jwt';
import { NotificationsService } from '@/api/notifications/notifications.service';
import { ListMyNotificationsQueryDto } from '../notifications/dto/list-my-notifications-query.dto';
import { MyNotificationsResponseDto } from '../notifications/dto/my-notifications-response.dto';
import { NotificationDto } from '../notifications/dto/notification.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  async listInvitations(userId: string, q: MeInvitationsQueryDto): Promise<MeInvitationsResponseDto> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    const where = {
      userId,
      status: EventParticipantStatus.INVITED,
    };

    const [totalCount, rows] = await this.prisma.$transaction([
      this.prisma.eventParticipant.count({ where }),
      this.prisma.eventParticipant.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDateTime: true,
              locationName: true,
              organiser: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { event: { startDateTime: 'asc' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return {
      items: rows.map((p) => ({
        participantId: p.id,
        eventId: p.eventId,
        role: p.role as any,
        status: 'INVITED',
        eventTitle: p.event.title,
        startDateTime: p.event.startDateTime,
        locationName: p.event.locationName ?? null,
        organiserId: p.event.organiser.id,
        organiserFirstName: p.event.organiser.firstName,
        organiserLastName: p.event.organiser.lastName ?? null,
      })),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  listMyNotifications(user: JwtUser, query: ListMyNotificationsQueryDto): Promise<MyNotificationsResponseDto> {
    return this.notificationsService.listForUser(user.userId, query);
  }

  markNotificationAsRead(user: JwtUser, notificationId: string): Promise<NotificationDto> {
    return this.notificationsService.markAsRead(user.userId, notificationId);
  }
}
