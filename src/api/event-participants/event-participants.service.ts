import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent } from '@prisma/client';
import { InviteParticipantResponseDto } from './dto/invite-participant-response.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { RespondInvitationResponseDto } from './dto/respond-invitation-response.dto';
import { EventParticipantDto } from './dto/event-participant.dto';
import { UpsertMyParticipationDto } from './dto/upsert-my-participation.dto';
import { UpdateMySelectionDto } from './dto/update-my-selection.dto';
import { ListEventParticipantsQueryDto } from './dto/list-event-participants-query.dto';
import { EventParticipantsListResponseDto } from './dto/event-participants-list.dto';

@Injectable()
export class EventParticipantsService {
  constructor(private readonly prisma: PrismaService) { }

  async createOrganiserParticipant(eventId: string, userId: string) {
    return this.prisma.eventParticipant.create({
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
      select: { id: true, organiserId: true },
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

  private toDto(p: any): EventParticipantDto {
    const displayName = p.user?.lastName ? `${p.user.firstName} ${p.user.lastName}` : `${p.user?.firstName ?? ''}`.trim();
    return {
      userId: p.userId,
      displayName,
      roleInEvent: p.role,
      status: p.status as EventParticipantStatus,
      eventRouteId: p.eventRouteId ?? null,
      eventGroupId: p.eventGroupId ?? null,
    };
  }

  async listEventParticipantsForOrganiser(
    eventId: string,
    organiserId: string,
    q: ListEventParticipantsQueryDto,
  ): Promise<EventParticipantsListResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organiserId: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) throw new ForbiddenException('Only organiser can view participants');

    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;

    // default: exclude DECLINED
    const where: any = {
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
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return {
      items: rows.map((p) => {
        const displayName = p.user?.lastName ? `${p.user.firstName} ${p.user.lastName}` : (p.user?.firstName ?? 'Guest');

        return {
          participantId: p.id,
          userId: p.userId ?? null,
          displayName,
          roleInEvent: p.role as any,
          status: p.status as any,
          eventRoute: p.eventRoute ? { id: p.eventRoute.id, name: p.eventRoute.name } : null,
          eventGroup: p.eventGroup ? { id: p.eventGroup.id, label: p.eventGroup.label } : null,
        };
      }),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }
}
