import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus, UserPlan } from '@prisma/client';
import { MeInvitationsQueryDto } from './dto/me-invitations-query.dto';
import { MeInvitationsResponseDto } from './dto/me-invitations-response.dto';
import { JwtUser } from '@/types/jwt';
import { NotificationsService } from '@/api/notifications/notifications.service';
import { ListMyNotificationsQueryDto } from '../notifications/dto/list-my-notifications-query.dto';
import { MyNotificationsResponseDto } from '../notifications/dto/my-notifications-response.dto';
import { NotificationDto } from '../notifications/dto/notification.dto';
import { MeEventsQueryDto } from './dto/me-events-query.dto';
import { MeEventsListResponseDto } from './dto/me-events-list.response.dto';
import { MeProfileWithBenefitsResponseDto, PlanBenefitsDto } from './dto/me-profile.dto';
import { buildDisplayName } from '@/common/utils/display-name.util';
import { normalizePagination, computePaginationMeta } from '@/common/utils/pagination.util';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}
  async getProfile(user: JwtUser): Promise<MeProfileWithBenefitsResponseDto> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isGuest: true,
        plan: true,
        planSince: true,
        planUntil: true,
        acceptedTermsAt: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    const displayName = buildDisplayName(dbUser);
    const planBenefits = this.getPlanBenefits(dbUser.plan);

    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      displayName,
      isGuest: dbUser.isGuest,
      plan: dbUser.plan,
      planSince: dbUser.planSince,
      planUntil: dbUser.planUntil,
      acceptedTermsAt: dbUser.acceptedTermsAt,
      createdAt: dbUser.createdAt,
      planBenefits,
    };
  }

  private getPlanBenefits(plan: UserPlan): PlanBenefitsDto {
    if (plan === UserPlan.PREMIUM) {
      return {
        maxActiveEventsPerWeek: -1, // unlimited
        globalRouteLibraryAccess: true,
        description: 'Tu es sur The Run Premium : événements actifs illimités, accès à la bibliothèque globale de parcours.',
      };
    }

    // FREE plan
    return {
      maxActiveEventsPerWeek: 1,
      globalRouteLibraryAccess: false,
      description: 'Tu es sur The Run Free : 1 événement actif par semaine, accès limité à tes propres parcours.',
    };
  }

  async listInvitations(userId: string, q: MeInvitationsQueryDto): Promise<MeInvitationsResponseDto> {
    const pagination = normalizePagination(q);

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
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    const meta = computePaginationMeta(totalCount, pagination);

    return {
      items: rows.map((p) => ({
        participantId: p.id,
        eventId: p.eventId,
        role: p.role as 'PARTICIPANT' | 'ENCADRANT',
        status: 'INVITED' as const,
        eventTitle: p.event.title,
        startDateTime: p.event.startDateTime,
        locationName: p.event.locationName ?? null,
        organiserId: p.event.organiser.id,
        organiserFirstName: p.event.organiser.firstName,
        organiserLastName: p.event.organiser.lastName ?? null,
      })),
      ...meta,
    };
  }

  listMyNotifications(user: JwtUser, query: ListMyNotificationsQueryDto): Promise<MyNotificationsResponseDto> {
    return this.notificationsService.listForUser(user.userId, query);
  }

  markNotificationAsRead(user: JwtUser, notificationId: string): Promise<NotificationDto> {
    return this.notificationsService.markAsRead(user.userId, notificationId);
  }
  async listMyEvents(user: JwtUser, query: MeEventsQueryDto): Promise<MeEventsListResponseDto> {
    const pagination = normalizePagination(query);
    const userId = user.userId;
    const now = new Date();

    const whereBase = { organiserId: userId };
    let where: typeof whereBase & { status?: EventStatus; startDateTime?: { gt: Date } } = whereBase;
    let orderBy: { startDateTime: 'asc' | 'desc' } = { startDateTime: 'asc' };

    if (query.scope === 'future') {
      where = {
        ...whereBase,
        status: EventStatus.PLANNED,
        startDateTime: { gt: now },
      };
      orderBy = { startDateTime: 'asc' };
    } else if (query.scope === 'past') {
      where = { ...whereBase, status: EventStatus.COMPLETED };
      orderBy = { startDateTime: 'desc' };
    } else if (query.scope === 'cancelled') {
      where = { ...whereBase, status: EventStatus.CANCELLED };
      orderBy = { startDateTime: 'desc' };
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.pageSize,
        select: {
          id: true,
          title: true,
          startDateTime: true,
          status: true,
          locationName: true,
          locationAddress: true,
          goingCountAtCompletion: true,
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

    return { items, page: pagination.page, pageSize: pagination.pageSize, total };
  }
}
