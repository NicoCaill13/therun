import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, NotificationType, Prisma, RoleInEvent } from '@prisma/client';
import { InviteParticipantResponseDto } from './dto/invite-participant-response.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { RespondInvitationResponseDto } from './dto/respond-invitation-response.dto';
import { EventParticipantDto } from './dto/event-participant.dto';
import { UpsertMyParticipationDto } from './dto/upsert-my-participation.dto';
import { UpdateMySelectionDto } from './dto/update-my-selection.dto';
import { ListEventParticipantsQueryDto } from './dto/list-event-participants-query.dto';
import { EventParticipantsListResponseDto } from './dto/event-participants-list.dto';
import { EventParticipantsSummaryDto } from './dto/event-participants-summary.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { BroadcastEventDto } from '../events/dto/broadcast-event.dto';
import { BroadcastEventResponseDto } from '../events/dto/broadcast-event-response.dto';
import { buildDisplayName } from '@/common/utils/display-name.util';
import { normalizePagination, computePaginationMeta } from '@/common/utils/pagination.util';
import { findEventOrThrow, findEventAsOrganiserOrThrow } from '@/common/helpers/event-access.helper';

@Injectable()
export class EventParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrganiserParticipant(eventId: string, userId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    const existing = await db.eventParticipant.findFirst({
      where: { eventId, userId, role: RoleInEvent.ORGANISER },
    });
    if (existing) return existing;
    return db.eventParticipant.create({
      data: {
        eventId,
        userId,
        role: RoleInEvent.ORGANISER,
        status: EventParticipantStatus.GOING,
      },
    });
  }

  listByEventWithUser(eventId: string) {
    return this.prisma.eventParticipant.findMany({
      where: { eventId },
      include: {
        user: true,
      },
    });
  }

  async inviteExistingUser(
    eventId: string,
    callerId: string,
    dto: InviteParticipantDto,
  ): Promise<{ created: boolean; data: InviteParticipantResponseDto }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organiserId: true, title: true, startDateTime: true, locationName: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organiserId !== callerId) {
      throw new ForbiddenException('Only organiser can invite participants');
    }
    if (dto.userId === callerId) {
      throw new ConflictException('Organiser cannot invite himself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get organiser info for notification
    const organiser = await this.prisma.user.findUnique({
      where: { id: callerId },
      select: { firstName: true, lastName: true },
    });
    const organiserName = organiser ? [organiser.firstName, organiser.lastName].filter(Boolean).join(' ') : 'Un organisateur';

    const existing = await this.prisma.eventParticipant.findFirst({
      where: { eventId, userId: dto.userId },
    });

    if (existing) {
      const updated = await this.prisma.eventParticipant.update({
        where: { id: existing.id },
        data: {
          role: dto.role as RoleInEvent,
          status: EventParticipantStatus.INVITED,
        },
      });

      // S3.1.2: Create invitation notification (re-invite case)
      await this.createInvitationNotification(dto.userId, eventId, event, organiserName, updated.id);

      return {
        created: false,
        data: {
          id: updated.id,
          eventId: updated.eventId,
          userId: updated.userId!,
          role: updated.role as 'PARTICIPANT' | 'ENCADRANT',
          status: 'INVITED',
        },
      };
    }

    const created = await this.prisma.eventParticipant.create({
      data: {
        eventId,
        userId: dto.userId,
        role: dto.role as RoleInEvent,
        status: EventParticipantStatus.INVITED,
      },
    });

    // S3.1.2: Create invitation notification
    await this.createInvitationNotification(dto.userId, eventId, event, organiserName, created.id);

    return {
      created: true,
      data: {
        id: created.id,
        eventId: created.eventId,
        userId: created.userId!,
        role: created.role as 'PARTICIPANT' | 'ENCADRANT',
        status: 'INVITED',
      },
    };
  }

  /**
   * S3.1.2: Create a notification when a user is invited to an event
   */
  private async createInvitationNotification(
    userId: string,
    eventId: string,
    event: { title: string; startDateTime: Date; locationName: string | null },
    organiserName: string,
    participantId: string,
  ): Promise<void> {
    const title = `Invitation – ${event.title}`;
    const bodyParts = [
      `${organiserName} t'invite à participer`,
      `Départ: ${event.startDateTime.toISOString()}`,
      event.locationName ? `Lieu: ${event.locationName}` : null,
    ].filter(Boolean);

    await this.notificationsService.createOne({
      userId,
      eventId,
      type: NotificationType.EVENT_INVITATION,
      title,
      body: bodyParts.join(' • '),
      data: {
        eventId,
        participantId,
        organiserName,
      },
      dedupKey: `event:${eventId}:invitation:${userId}:${Date.now()}`,
    });
  }

  async respondToInvitation(
    eventId: string,
    participantId: string,
    callerUserId: string,
    dto: RespondInvitationDto,
  ): Promise<RespondInvitationResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { id: participantId },
    });

    // Not found OR mismatch eventId => 404 (comme story)
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException('Participant not found');
    }

    if (!participant.userId || participant.userId !== callerUserId) {
      throw new ForbiddenException('You can only respond to your own invitation');
    }

    if (participant.status !== EventParticipantStatus.INVITED) {
      throw new ConflictException('Invitation already handled');
    }

    const updated = await this.prisma.eventParticipant.update({
      where: { id: participantId },
      data: { status: dto.status as EventParticipantStatus },
    });

    return {
      id: updated.id,
      eventId: updated.eventId,
      userId: updated.userId!,
      role: updated.role as any,
      status: updated.status as any,
    };
  }

  async upsertMyParticipation(eventId: string, userId: string, dto: UpsertMyParticipationDto): Promise<EventParticipantDto> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const participant = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.eventParticipant.findFirst({
        where: { eventId, userId },
        select: { id: true },
      });

      if (existing) {
        return tx.eventParticipant.update({
          where: { id: existing.id },
          data: { status: dto.status },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
      }

      return tx.eventParticipant.create({
        data: {
          eventId,
          userId,
          role: RoleInEvent.PARTICIPANT,
          status: dto.status,
          eventRouteId: null,
          eventGroupId: null,
        },
        include: { user: { select: { firstName: true, lastName: true } } },
      });
    });

    return this.toDto(participant);
  }

  async updateMySelection(eventId: string, userId: string, dto: UpdateMySelectionDto): Promise<EventParticipantDto> {
    // 1) au moins un champ présent
    const hasRoute = dto.eventRouteId !== undefined; // null = présent
    const hasGroup = dto.eventGroupId !== undefined;
    if (!hasRoute && !hasGroup) {
      throw new BadRequestException('At least one of eventRouteId or eventGroupId must be provided');
    }

    // 2) event existe
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    // 3) participant existe
    const participant = await this.prisma.eventParticipant.findFirst({
      where: { eventId, userId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!participant) {
      throw new ConflictException('You must RSVP before selecting a route/group');
    }

    // Helpers de cohérence
    const loadEventRoute = async (eventRouteId: string) => {
      const er = await this.prisma.eventRoute.findFirst({
        where: { id: eventRouteId, eventId },
        select: { id: true },
      });
      if (!er) throw new NotFoundException('EventRoute not found');
      return er;
    };

    const loadEventGroup = async (eventGroupId: string) => {
      const g = await this.prisma.eventGroup.findUnique({
        where: { id: eventGroupId },
        select: { id: true, eventRouteId: true },
      });
      if (!g) throw new NotFoundException('EventGroup not found');

      // s’assurer que le group appartient à un EventRoute de CET event
      const routeOfGroup = await this.prisma.eventRoute.findFirst({
        where: { id: g.eventRouteId, eventId },
        select: { id: true },
      });
      if (!routeOfGroup) throw new NotFoundException('EventGroup not found');

      return g;
    };

    // 4) validations
    // eventRouteId fourni (non-null)
    if (hasRoute && dto.eventRouteId !== null) {
      await loadEventRoute(dto.eventRouteId!);
    }

    // eventGroupId fourni (non-null)
    let group: { id: string; eventRouteId: string } | null = null;
    if (hasGroup && dto.eventGroupId !== null) {
      group = await loadEventGroup(dto.eventGroupId!);
    }

    // cohérence group vs route
    // cas: group + route fournis
    if (hasGroup && dto.eventGroupId !== null && hasRoute && dto.eventRouteId !== null) {
      if (group!.eventRouteId !== dto.eventRouteId) {
        throw new ConflictException('EventGroup does not belong to selected EventRoute');
      }
    }

    // cas: group fourni, route NON fourni
    if (hasGroup && dto.eventGroupId !== null && !hasRoute) {
      if (!participant.eventRouteId) {
        throw new ConflictException('You must select a route before selecting a group');
      }
      if (group!.eventRouteId !== participant.eventRouteId) {
        throw new ConflictException('EventGroup does not belong to selected EventRoute');
      }
    }

    // 5) persistance
    const data: any = {};

    // route présent => update route (y compris null)
    if (hasRoute) {
      data.eventRouteId = dto.eventRouteId;
      // si route = null => group auto null
      if (dto.eventRouteId === null) {
        data.eventGroupId = null;
      }
    }

    // group présent => update group (y compris null)
    if (hasGroup) {
      data.eventGroupId = dto.eventGroupId;
    }

    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    return this.toDto(updated);
  }

  private toDto(p: { userId: string | null; role: RoleInEvent; status: EventParticipantStatus; eventRouteId: string | null; eventGroupId: string | null; user?: { firstName: string; lastName: string | null } | null }): EventParticipantDto {
    return {
      userId: p.userId,
      displayName: buildDisplayName(p.user, 'Participant'),
      roleInEvent: p.role,
      status: p.status,
      eventRouteId: p.eventRouteId ?? null,
      eventGroupId: p.eventGroupId ?? null,
    };
  }

  async listEventParticipantsForOrganiser(
    eventId: string,
    organiserId: string,
    q: ListEventParticipantsQueryDto,
  ): Promise<EventParticipantsListResponseDto> {
    await findEventAsOrganiserOrThrow(this.prisma, eventId, organiserId, undefined, 'Only organiser can view participants');

    const pagination = normalizePagination(q);

    const where = {
      eventId,
      ...(q.status ? { status: q.status } : { status: { not: EventParticipantStatus.DECLINED } }),
      ...(q.eventRouteId ? { eventRouteId: q.eventRouteId } : {}),
      ...(q.eventGroupId ? { eventGroupId: q.eventGroupId } : {}),
    };

    const [totalCount, rows] = await this.prisma.$transaction([
      this.prisma.eventParticipant.count({ where }),
      this.prisma.eventParticipant.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true } },
          eventRoute: { select: { id: true, name: true } },
          eventGroup: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: pagination.skip,
        take: pagination.pageSize,
      }),
    ]);

    const meta = computePaginationMeta(totalCount, pagination);

    return {
      items: rows.map((p) => ({
        participantId: p.id,
        userId: p.userId ?? null,
        displayName: buildDisplayName(p.user, 'Guest'),
        roleInEvent: p.role,
        status: p.status,
        eventRoute: p.eventRoute ? { id: p.eventRoute.id, name: p.eventRoute.name } : null,
        eventGroup: p.eventGroup ? { id: p.eventGroup.id, label: p.eventGroup.label } : null,
      })),
      ...meta,
    };
  }

  async getParticipantsSummary(eventId: string, organiserId: string): Promise<EventParticipantsSummaryDto> {
    await findEventAsOrganiserOrThrow(this.prisma, eventId, organiserId, undefined, 'Only organiser can view participants');

    // counts principaux
    const [goingCount, invitedCount, maybeCount] = await Promise.all([
      this.prisma.eventParticipant.count({ where: { eventId, status: EventParticipantStatus.GOING } }),
      this.prisma.eventParticipant.count({ where: { eventId, status: EventParticipantStatus.INVITED } }),
      this.prisma.eventParticipant.count({ where: { eventId, status: EventParticipantStatus.MAYBE } }),
    ]);

    // répartition par parcours (GOING uniquement)
    const routes = await this.prisma.eventRoute.findMany({
      where: { eventId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const goingByRoute = await this.prisma.eventParticipant.groupBy({
      by: ['eventRouteId'],
      where: { eventId, status: EventParticipantStatus.GOING, eventRouteId: { not: null } },
      _count: { _all: true },
    });

    const byRoute = routes.map((r) => {
      const found = goingByRoute.find((x) => x.eventRouteId === r.id);
      return {
        eventRouteId: r.id,
        name: r.name,
        goingCount: found?._count._all ?? 0,
      };
    });

    const groups = await this.prisma.eventGroup.findMany({
      where: { eventRoute: { eventId } },
      select: { id: true, label: true },
      orderBy: { createdAt: 'asc' },
    });

    const goingByGroup = await this.prisma.eventParticipant.groupBy({
      by: ['eventGroupId'],
      where: { eventId, status: EventParticipantStatus.GOING, eventGroupId: { not: null } },
      _count: { _all: true },
    });

    const byGroup = groups.map((g) => {
      const found = goingByGroup.find((x) => x.eventGroupId === g.id);
      return {
        eventGroupId: g.id,
        label: g.label,
        goingCount: found?._count._all ?? 0,
      };
    });

    return { goingCount, invitedCount, maybeCount, byRoute, byGroup };
  }

  async broadcastToParticipants(eventId: string, currentUserId: string, dto: BroadcastEventDto): Promise<BroadcastEventResponseDto> {
    await findEventAsOrganiserOrThrow(this.prisma, eventId, currentUserId, undefined, 'Only organiser can broadcast to participants');

    const participants = await this.prisma.eventParticipant.findMany({
      where: {
        eventId,
        status: { not: EventParticipantStatus.DECLINED },
        userId: { not: null }, // sécurité: Notification.userId est required
      },
      select: { id: true, userId: true },
    });

    if (participants.length === 0) return { sentCount: 0 };

    const title = dto.title?.trim() ? dto.title.trim() : 'Message de l’organisateur';
    const body = dto.body;

    const rows = participants.map((p) => ({
      userId: p.userId!,
      eventId,
      type: NotificationType.EVENT_BROADCAST,
      title,
      body,
      data: {
        eventId,
        participantId: p.id,
        fromUserId: currentUserId,
      },
      dedupKey: `event:${eventId}:broadcast:${Date.now()}:${p.id}`,
    }));

    const res = await this.notificationsService.createMany(rows);

    return { sentCount: res.createdCount };
  }
}
