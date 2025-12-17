import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent } from '@prisma/client';
import { InviteParticipantResponseDto } from './dto/invite-participant-response.dto';
import { InviteParticipantDto } from './dto/invite-participant.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { RespondInvitationResponseDto } from './dto/respond-invitation-response.dto';
import { EventParticipantDto } from './dto/event-participant.dto';
import { UpsertMyParticipationDto } from './dto/upsert-my-participation.dto';

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
}
