import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus } from '@prisma/client';
import { MeInvitationsQueryDto } from './dto/me-invitations-query.dto';
import { MeInvitationsResponseDto } from './dto/me-invitations-response.dto';
import { JwtUser } from '@/types/jwt';
import { NotificationsService } from '@/api/notifications/notifications.service';
import { ListMyNotificationsQueryDto } from '../notifications/dto/list-my-notifications-query.dto';
import { MyNotificationsResponseDto } from '../notifications/dto/my-notifications-response.dto';
import { NotificationDto } from '../notifications/dto/notification.dto';
import { MeEventsQueryDto } from './dto/me-events-query.dto';
import { MeEventsListResponseDto } from './dto/me-events-list.response.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

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
  async listMyEvents(user: JwtUser, query: MeEventsQueryDto): Promise<MeEventsListResponseDto> {
    const page = query.page ?? DEFAULT_PAGE;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;
    const userId = user.userId;

    const now = new Date();

    const whereBase: any = { organiserId: userId };

    let where: any = whereBase;
    let orderBy: any = { startDateTime: 'asc' };

    if (query.scope === 'future') {
      where = {
        ...whereBase,
        status: EventStatus.PLANNED,
        startDateTime: { gt: now },
      };
      orderBy = { startDateTime: 'asc' };
    }

    if (query.scope === 'past') {
      where = { ...whereBase, status: EventStatus.COMPLETED };
      orderBy = { startDateTime: 'desc' };
    }
    if (query.scope === 'cancelled') {
      where = { ...whereBase, status: EventStatus.CANCELLED };
      orderBy = { startDateTime: 'desc' };
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          startDateTime: true,
          status: true,
          locationName: true,
          locationAddress: true,
          goingCountAtCompletion: true, // ✅ snapshot (S7.1.1)
        },
      }),
    ]);

    const eventIds = events.map((e) => e.id);

    const goingCounts = eventIds.length
      ? await this.prisma.eventParticipant.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds }, status: EventParticipantStatus.GOING },
        _count: { _all: true },
      })
      : [];

    const goingByEventId = new Map<string, number>(goingCounts.map((x) => [x.eventId, x._count._all]));

    const items = events.map((e) => {
      const fallback = goingByEventId.get(e.id) ?? 0;

      // ✅ règle : pour COMPLETED, utiliser snapshot si présent
      const goingCount = e.status === EventStatus.COMPLETED && e.goingCountAtCompletion != null ? e.goingCountAtCompletion : fallback;

      return {
        id: e.id,
        title: e.title,
        startDateTime: e.startDateTime,
        status: e.status,
        locationName: e.locationName ?? null,
        locationAddress: e.locationAddress ?? null,
        goingCount,
      };
    });
    return { items, page, pageSize, total };
  }
}
