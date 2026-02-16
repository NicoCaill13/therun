import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus, NotificationType, RoleInEvent, UserPlan } from '@/common/enums';
import { User } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { EventParticipantsService } from '../event-participants/event-participants.service';
import { EventBlockResponseDto, EventDetailsResponseDto } from './dto/event-details-response.dto';
import { CurrentUserParticipationResponseDto, EventParticipantDto } from '../event-participants/dto/event-participant.dto';
import { SimpleUserResponseDto } from '../users/dto/simple-user.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateParticipantRoleDto } from '../event-participants/dto/update-participant-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { PublicEventByCodeResponseDto } from './dto/public-event-by-code-response.dto';
import { PublicGuestJoinDto } from './dto/public-guest-join.dto';
import { PublicGuestJoinResponseDto } from './dto/public-guest-join-response.dto';
import { toIsoString } from '@/common/utils/date.util';
import { getStartOfIsoWeek, getStartOfNextIsoWeek } from '@/common/utils/date.util';
import { locationSignature } from '@/common/utils/geo.util';
import { buildGuestDisplayName } from '@/common/utils/display-name.util';
import { AuthService } from '@/infrastructure/auth/auth.service';
import { EventCodeService } from './event-code.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventParticipantService: EventParticipantsService,
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService,
    private readonly eventCodeService: EventCodeService,
  ) {}

  /**
   * Free plan: 1 active event per week max.
   */
  private async assertCanCreateEventForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) throw new ForbiddenException('User not found');
    if (user.plan === UserPlan.PREMIUM) return;

    const now = new Date();
    const monday = getStartOfIsoWeek(now);
    const nextMonday = getStartOfNextIsoWeek(now);

    const activeCount = await this.prisma.event.count({
      where: {
        organiserId: userId,
        status: EventStatus.PLANNED,
        startDateTime: { gte: monday, lt: nextMonday },
      },
    });

    if (activeCount >= 1) {
      throw new ForbiddenException('Limite The Run Free atteinte : 1 événement actif par semaine. Passe en Premium pour en créer plus.');
    }
  }

  private getUserDisplayName(user: User | null): string {
    return buildGuestDisplayName(user);
  }

  private buildParticipantDtoFromEntity(ep: {
    userId: string | null;
    displayName?: string | null;
    role: RoleInEvent;
    status: EventParticipantStatus;
    eventRouteId: string | null;
    eventGroupId: string | null;
    user: User | null;
  }): EventParticipantDto {
    const displayName = ep.user !== null ? this.getUserDisplayName(ep.user) : (ep.displayName ?? 'Invité');

    const plain = {
      userId: ep.userId ?? '',
      displayName,
      roleInEvent: ep.role,
      status: ep.status,
      eventRouteId: ep.eventRouteId,
      eventGroupId: ep.eventGroupId,
    };

    return plainToInstance(EventParticipantDto, plain, {
      excludeExtraneousValues: true,
    });
  }

  async createForOrganiser(organiserId: string, dto: CreateEventDto) {
    await this.assertCanCreateEventForUser(organiserId);

    const eventCode = await this.eventCodeService.generateUniqueEventCode();

    const data = {
      description: dto.description,
      startDateTime: new Date(dto.startDateTime),
      status: EventStatus.PLANNED,
      organiserId,
      locationName: dto.locationName,
      locationAddress: dto.locationAddress,
      locationLat: dto.locationLat,
      locationLng: dto.locationLng,
      eventCode,
      title: dto.title,
    };
    const event = await this.prisma.event.create({ data });

    await this.eventParticipantService.createOrganiserParticipant(event.id, organiserId);

    return event;
  }

  async getEventDetails(eventId: string, organiserId: string): Promise<EventDetailsResponseDto> {
    if (!organiserId) throw new ForbiddenException('Unauthenticated user');

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organiser: true,
        participants: { include: { user: true } },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    const eventBlock: EventBlockResponseDto = {
      id: event.id,
      title: event.title,
      description: event.description,
      startDateTime: event.startDateTime,
      locationName: event.locationName,
      locationAddress: event.locationAddress,
      locationLat: event.locationLat,
      locationLng: event.locationLng,
      status: event.status,
      eventCode: event.eventCode,
      completedAt: event.completedAt,
      goingCountAtCompletion: event.goingCountAtCompletion,
    };

    const organiserDto: SimpleUserResponseDto = {
      id: event.organiser.id,
      displayName: this.getUserDisplayName(event.organiser),
      avatarUrl: null,
    };

    const participantsDto: EventParticipantDto[] = event.participants.map((ep) => ({
      userId: ep.userId,
      displayName: ep.user ? this.getUserDisplayName(ep.user) : 'Invité',
      roleInEvent: ep.role,
      status: ep.status,
      eventRouteId: ep.eventRouteId,
      eventGroupId: ep.eventGroupId,
    }));

    const currentEp = event.participants.find((ep) => ep.userId === organiserId) || null;

    const currentUserParticipation: CurrentUserParticipationResponseDto | null = currentEp
      ? {
          userId: currentEp.userId,
          roleInEvent: currentEp.role,
          status: currentEp.status,
          eventRouteId: currentEp.eventRouteId,
          eventGroupId: currentEp.eventGroupId,
        }
      : null;

    return plainToInstance(
      EventDetailsResponseDto,
      { event: eventBlock, organiser: organiserDto, participants: participantsDto, currentUserParticipation },
      { excludeExtraneousValues: true },
    );
  }

  async updateParticipantRole(
    eventId: string,
    targetUserId: string,
    currentUserId: string,
    dto: UpdateParticipantRoleDto,
  ): Promise<EventParticipantDto> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== currentUserId) {
      throw new ForbiddenException('Only the organiser can update participant roles for this event');
    }

    if (dto.roleInEvent !== RoleInEvent.ENCADRANT) {
      throw new BadRequestException('Only promotion to ENCADRANT is supported in this version');
    }

    const participant = await this.prisma.eventParticipant.findFirst({
      where: { eventId, userId: targetUserId },
      include: { user: true },
    });
    if (!participant) throw new NotFoundException('Participant not found for this event');
    if (participant.role === RoleInEvent.ORGANISER) {
      throw new BadRequestException('Cannot change the role of the organiser');
    }

    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { role: RoleInEvent.ENCADRANT },
      include: { user: true },
    });

    return this.buildParticipantDtoFromEntity(updated);
  }

  async updateEvent(eventId: string, currentUserId: string, dto: UpdateEventDto) {
    const before = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, title: true, organiserId: true, startDateTime: true, status: true,
        locationName: true, locationAddress: true, locationLat: true, locationLng: true,
      },
    });

    if (!before) throw new NotFoundException('Event not found');
    if (before.organiserId !== currentUserId) throw new ForbiddenException('Only organiser can update this event');

    const startDateTime = dto.startDateTime ? new Date(dto.startDateTime) : undefined;

    const after = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        startDateTime,
        locationName: dto.locationName,
        locationAddress: dto.locationAddress,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        status: dto.status,
      },
      select: {
        id: true, title: true, organiserId: true, startDateTime: true, status: true,
        locationName: true, locationAddress: true, locationLat: true, locationLng: true,
      },
    });

    const timeChanged = dto.startDateTime !== undefined && before.startDateTime.toISOString() !== after.startDateTime.toISOString();
    const locChanged =
      (dto.locationName !== undefined || dto.locationAddress !== undefined || dto.locationLat !== undefined || dto.locationLng !== undefined) &&
      locationSignature(before) !== locationSignature(after);
    const cancelled = dto.status !== undefined && before.status !== EventStatus.CANCELLED && after.status === EventStatus.CANCELLED;

    if (timeChanged || locChanged || cancelled) {
      const targets = await this.prisma.eventParticipant.findMany({
        where: {
          eventId,
          status: { in: [EventParticipantStatus.GOING, EventParticipantStatus.INVITED] },
          userId: { not: null },
        },
        select: { id: true, userId: true, status: true },
      });

      if (targets.length > 0) {
        const { type, title, body, data } = this.buildCriticalChangeNotification(before, after, { timeChanged, locChanged, cancelled });

        const rows = targets.map((p) => ({
          userId: p.userId!,
          eventId,
          type,
          title,
          body,
          data: { ...data, eventId, participantId: p.id, participantStatus: p.status },
        }));

        await this.notificationsService.createMany(rows);
      }
    }

    return after;
  }

  private buildCriticalChangeNotification(
    before: { title: string; startDateTime: Date; locationName: string | null; locationAddress: string | null; locationLat: number | null; locationLng: number | null; status: EventStatus },
    after: { title: string; startDateTime: Date; locationName: string | null; locationAddress: string | null; locationLat: number | null; locationLng: number | null; status: EventStatus },
    flags: { timeChanged: boolean; locChanged: boolean; cancelled: boolean },
  ): { type: NotificationType; title: string; body: string; data: Record<string, unknown> } {
    const title = `Mise à jour – ${after.title}`;

    if (flags.cancelled) {
      return {
        type: NotificationType.EVENT_CANCELLED,
        title: `Annulation – ${after.title}`,
        body: `L'événement a été annulé. • Voir les détails`,
        data: { reason: 'CANCELLED', beforeStatus: before.status, afterStatus: after.status },
      };
    }

    if (flags.timeChanged && !flags.locChanged) {
      return {
        type: NotificationType.EVENT_CHANGED_TIME,
        title,
        body: `Changement d'horaire : initialement ${toIsoString(before.startDateTime)} • nouvelle heure ${toIsoString(after.startDateTime)} • Voir les détails`,
        data: { beforeStartDateTime: toIsoString(before.startDateTime), afterStartDateTime: toIsoString(after.startDateTime) },
      };
    }

    if (!flags.timeChanged && flags.locChanged) {
      return {
        type: NotificationType.EVENT_CHANGED_LOCATION,
        title,
        body: `Changement de lieu : initialement ${before.locationName ?? '—'} • nouveau lieu ${after.locationName ?? '—'} • Voir les détails`,
        data: {
          beforeLocation: { locationName: before.locationName, locationAddress: before.locationAddress, locationLat: before.locationLat, locationLng: before.locationLng },
          afterLocation: { locationName: after.locationName, locationAddress: after.locationAddress, locationLat: after.locationLat, locationLng: after.locationLng },
        },
      };
    }

    return {
      type: NotificationType.EVENT_UPDATED,
      title,
      body: `L'événement a été mis à jour (heure/lieu). • Voir les détails`,
      data: {
        timeChanged: flags.timeChanged,
        locChanged: flags.locChanged,
        before: { startDateTime: toIsoString(before.startDateTime), locationName: before.locationName },
        after: { startDateTime: toIsoString(after.startDateTime), locationName: after.locationName },
      },
    };
  }

  async getPublicByCode(eventCode: string): Promise<PublicEventByCodeResponseDto> {
    const code = (eventCode ?? '').trim();
    if (!code) throw new BadRequestException('eventCode is required');

    const ev = await this.prisma.event.findUnique({
      where: { eventCode: code },
      select: {
        id: true, eventCode: true, title: true, startDateTime: true, status: true,
        locationName: true, locationAddress: true,
        organiser: { select: { firstName: true, lastName: true } },
      },
    });

    if (!ev) throw new NotFoundException('Event not found');
    if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.COMPLETED) {
      throw new NotFoundException('Event not available');
    }

    return {
      id: ev.id,
      eventCode: ev.eventCode,
      title: ev.title,
      startDateTime: ev.startDateTime.toISOString(),
      status: ev.status,
      locationName: ev.locationName,
      locationAddress: ev.locationAddress,
      organiser: { firstName: ev.organiser.firstName, lastName: ev.organiser.lastName },
      join: { eventId: ev.id, eventCode: ev.eventCode },
    };
  }

  async guestJoinPublic(eventId: string, dto: PublicGuestJoinDto): Promise<PublicGuestJoinResponseDto> {
    const ev = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (!ev) throw new NotFoundException('Event not found');
    if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.COMPLETED) {
      throw new BadRequestException('Event not joinable');
    }

    const email = dto.email?.trim().toLowerCase() ?? null;

    let user = null as null | { id: string; isGuest: boolean; email: string | null };

    if (email) {
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, isGuest: true, email: true },
      });

      if (existing) {
        user = existing;
      } else {
        user = await this.prisma.user.create({
          data: { email, firstName: dto.firstName.trim(), lastName: dto.lastName?.trim() ?? null, isGuest: true, plan: UserPlan.FREE },
          select: { id: true, isGuest: true, email: true },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: { email: null, firstName: dto.firstName.trim(), lastName: dto.lastName?.trim() ?? null, isGuest: true, plan: UserPlan.FREE },
        select: { id: true, isGuest: true, email: true },
      });
    }

    const existingParticipant = await this.prisma.eventParticipant.findFirst({
      where: { eventId: ev.id, userId: user.id },
      select: { id: true },
    });

    if (existingParticipant) {
      const updated = await this.prisma.eventParticipant.update({
        where: { id: existingParticipant.id },
        data: { role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        select: { id: true },
      });

      const accessToken = this.authService.signGuest({ id: user.id, email: user.email });
      return { eventId: ev.id, participantId: updated.id, userId: user.id, isGuest: user.isGuest, accessToken };
    }

    const created = await this.prisma.eventParticipant.create({
      data: { eventId: ev.id, userId: user.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
      select: { id: true },
    });

    const accessToken = this.authService.signGuest({ id: user.id, email: user.email });
    return { eventId: ev.id, participantId: created.id, userId: user.id, isGuest: user.isGuest, accessToken };
  }
}
