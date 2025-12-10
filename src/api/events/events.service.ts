// src/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus, RoleInEvent, User, UserPlan } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UserService } from '../users/user.service';
import { EventParticipantService } from '../event-participants/event-participant.service';
import { EventBlockResponseDto, EventDetailsResponseDto } from './dto/event-details-response.dto';
import { CurrentUserParticipationResponseDto, EventParticipantDto } from '../event-participants/dto/event-participant.dto';
import { SimpleUserResponseDto } from '../users/dto/simple-user.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateParticipantRoleDto } from '../event-participants/dto/update-participant-role.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly eventParticipantService: EventParticipantService,
  ) { }

  // petit générateur de code évenement lisible
  private generateEventCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // évite 0/O/I confus
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async generateUniqueEventCode(): Promise<string> {
    // simple boucle de sécurité (probabilité de collision très faible)
    for (; ;) {
      const code = this.generateEventCode();
      const existing = await this.prisma.event.findUnique({
        where: { eventCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
  }

  /**
   * Vérifie la règle Free : 1 event actif / semaine
   * (MVP-8, mais autant l’appliquer dès maintenant).
   */
  private async assertCanCreateEventForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.plan === UserPlan.PREMIUM) {
      return; // no limit
    }

    // User FREE : 1 event PLANNED par semaine max
    const now = new Date();
    // semaine ISO simple : on recule au lundi
    const day = now.getDay(); // 0 = dimanche, 1 = lundi...
    const diffToMonday = (day + 6) % 7; // nb de jours depuis lundi
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7); // exclusif

    const activeCount = await this.prisma.event.count({
      where: {
        organiserId: userId,
        status: EventStatus.PLANNED,
        startDateTime: {
          gte: monday,
          lt: sunday,
        },
      },
    });

    if (activeCount >= 1) {
      throw new ForbiddenException('Limite The Run Free atteinte : 1 événement actif par semaine. Passe en Premium pour en créer plus.');
    }
  }

  private getUserDisplayName(user: User | null): string {
    if (!user) {
      return 'Invité';
    }
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.lastName || 'Invité';
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

    const eventCode = await this.generateUniqueEventCode();

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
    if (!organiserId) {
      throw new ForbiddenException('Unauthenticated user');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organiser: true,
        participants: {
          include: { user: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

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
    };

    const organiserDisplayName = this.getUserDisplayName(event.organiser);
    const organiserDto: SimpleUserResponseDto = {
      id: event.organiser.id,
      displayName: organiserDisplayName,
      avatarUrl: null,
    };

    const participantsDto: EventParticipantDto[] = event.participants.map((ep) => {
      const displayName = ep.user ? this.getUserDisplayName(ep.user) : 'Invité';

      return {
        userId: ep.userId,
        displayName,
        roleInEvent: ep.role,
        status: ep.status,
        eventRouteId: ep.eventRouteId,
        eventGroupId: ep.eventGroupId,
      };
    });

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

    const plain = {
      event: eventBlock,
      organiser: organiserDto,
      participants: participantsDto,
      currentUserParticipation,
    };

    return plainToInstance(EventDetailsResponseDto, plain, {
      excludeExtraneousValues: true,
    });
  }

  async updateParticipantRole(
    eventId: string,
    targetUserId: string,
    currentUserId: string,
    dto: UpdateParticipantRoleDto,
  ): Promise<EventParticipantDto> {
    // 1. Vérifier que l’event existe
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // 2. Vérifier que le caller est bien l’organisateur
    if (event.organiserId !== currentUserId) {
      throw new ForbiddenException('Only the organiser can update participant roles for this event');
    }

    // 3. Règle métier de la story : pour l’instant, on ne gère que ENCADRANT
    if (dto.roleInEvent !== RoleInEvent.ENCADRANT) {
      throw new BadRequestException('Only promotion to ENCADRANT is supported in this version');
    }

    // 4. Récupérer le participant pour cet event
    const participant = await this.prisma.eventParticipant.findFirst({
      where: {
        eventId,
        userId: targetUserId,
      },
      include: {
        user: true,
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found for this event');
    }

    // 5. On ne touche jamais au rôle de l’organisateur
    if (participant.role === RoleInEvent.ORGANISER) {
      throw new BadRequestException('Cannot change the role of the organiser');
    }

    // 6. Update du rôle en ENCADRANT (le status reste inchangé)
    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        role: RoleInEvent.ENCADRANT,
      },
      include: {
        user: true,
      },
    });

    // 7. Mapping vers un DTO propre
    return this.buildParticipantDtoFromEntity(updated);
  }

  async completeEvent(eventId: string, currentUserId: string) {
    // 1. Récupérer l’event
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // 2. Vérifier que le user courant est bien l’organisateur
    if (event.organiserId !== currentUserId) {
      throw new ForbiddenException('Only organiser can complete this event.');
    }

    // 3. Si l’event est annulé, on peut choisir de refuser (optionnel pour MVP)
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled event.');
    }

    // 4. Si déjà COMPLETED → idempotent : on ne refait pas un update
    if (event.status !== EventStatus.COMPLETED) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.COMPLETED,
        },
      });
    }

    // 5. On renvoie le même payload que GET /events/:eventId
    return this.getEventDetails(eventId, currentUserId);
  }
}
