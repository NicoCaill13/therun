// src/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus, NotificationType, RoleInEvent, User, UserPlan, Prisma } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { EventParticipantsService } from '../event-participants/event-participants.service';
import { EventBlockResponseDto, EventDetailsResponseDto } from './dto/event-details-response.dto';
import { CurrentUserParticipationResponseDto, EventParticipantDto } from '../event-participants/dto/event-participant.dto';
import { SimpleUserResponseDto } from '../users/dto/simple-user.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateParticipantRoleDto } from '../event-participants/dto/update-participant-role.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { randomInt } from 'crypto';
import { PublicEventByCodeResponseDto } from './dto/public-event-by-code-response.dto';
import { PublicGuestJoinDto } from './dto/public-guest-join.dto';
import { PublicGuestJoinResponseDto } from './dto/public-guest-join-response.dto';
import { Cron } from '@nestjs/schedule';
import { DuplicateEventDto } from './dto/duplicate-event.dto';

function iso(d: Date | null | undefined) {
  return d ? d.toISOString() : null;
}

function locationSignature(e: {
  locationName: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
}) {
  // on considère le lieu “critique” dès qu’un de ces champs change
  return `${e.locationName ?? ''}|${e.locationAddress ?? ''}|${e.locationLat ?? ''}|${e.locationLng ?? ''}`;
}

const EVENT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const AUTO_COMPLETE_AFTER_MINUTES = 240;
const DEFAULT_ROUTE_RADIUS_METERS = 3000;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventParticipantService: EventParticipantsService,
    private readonly notificationsService: NotificationsService,
  ) { }

  // petit générateur de code évenement lisible
  private generateEventCode(codeLength?: number): string {
    // crypto.randomInt(min, max) => max EXCLUSIF, donc 5..8 via 5..9
    const len = codeLength ?? randomInt(5, 9);

    let code = '';
    for (let i = 0; i < len; i++) {
      code += EVENT_CODE_ALPHABET[randomInt(0, EVENT_CODE_ALPHABET.length)];
    }
    return code;
  }

  private async generateUniqueEventCode(): Promise<string> {
    // MVP: retry silencieux
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateEventCode();

      const existing = await this.prisma.event.findUnique({
        where: { eventCode: code },
        select: { id: true },
      });

      if (!existing) return code;
    }

    throw new BadRequestException('Unable to generate unique eventCode');
  }

  private async publishEventRoutesToLibrary(
    tx: Prisma.TransactionClient,
    input: { eventId: string; organiserId: string; centerLat: number | null; centerLng: number | null },
  ): Promise<{ createdRoutesCount: number; linkedEventRoutesCount: number; skippedCount: number }> {
    const eventRoutes = await tx.eventRoute.findMany({
      where: { eventId: input.eventId },
      select: {
        id: true,
        routeId: true,
        name: true,
        encodedPolyline: true,
        distanceMeters: true,
        type: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let createdRoutesCount = 0;
    let linkedEventRoutesCount = 0;
    let skippedCount = 0;

    const centerLat = input.centerLat ?? 0; // fallback MVP (tests seedent un lieu)
    const centerLng = input.centerLng ?? 0;

    for (const er of eventRoutes) {
      // idempotence: déjà lié
      if (er.routeId) {
        skippedCount += 1;
        continue;
      }

      // garde-fous MVP
      if (!er.encodedPolyline || er.encodedPolyline.trim().length === 0) {
        // tracé invalide -> on skip (mais pas d'erreur)
        skippedCount += 1;
        continue;
      }

      const route = await tx.route.create({
        data: {
          ownerId: input.organiserId,
          name: er.name,
          encodedPolyline: er.encodedPolyline,
          distanceMeters: er.distanceMeters,
          centerLat,
          centerLng,
          radiusMeters: DEFAULT_ROUTE_RADIUS_METERS,
          type: er.type ?? null,
        },
        select: { id: true },
      });

      createdRoutesCount += 1;

      await tx.eventRoute.update({
        where: { id: er.id },
        data: { routeId: route.id },
      });
      linkedEventRoutesCount += 1;
    }

    return { createdRoutesCount, linkedEventRoutesCount, skippedCount };
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
      completedAt: event.completedAt,
      goingCountAtCompletion: event.goingCountAtCompletion,
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
    await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          organiserId: true,
          status: true,
          locationLat: true,
          locationLng: true,
        },
      });
      if (!event) {
        throw new NotFoundException('Event not found');
      }
      if (event.organiserId !== currentUserId) {
        throw new ForbiddenException('Only organiser can complete this event.');
      }
      if (event.status === EventStatus.CANCELLED) {
        throw new BadRequestException('Cannot complete a cancelled event.');
      }
      const goingCount = await tx.eventParticipant.count({
        where: { eventId: event.id, status: EventParticipantStatus.GOING },
      });

      if (event.status !== EventStatus.COMPLETED) {
        await tx.event.update({
          where: { id: event.id },
          data: {
            status: EventStatus.COMPLETED,
            completedAt: new Date(),
            goingCountAtCompletion: goingCount,
          },
        });
      }
      await this.publishEventRoutesToLibrary(tx, {
        eventId: event.id,
        organiserId: event.organiserId,
        centerLat: event.locationLat ?? null,
        centerLng: event.locationLng ?? null,
      });
    });
    return this.getEventDetails(eventId, currentUserId);
  }

  async updateEvent(eventId: string, currentUserId: string, dto: UpdateEventDto) {
    const before = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        organiserId: true,
        startDateTime: true,
        status: true,
        locationName: true,
        locationAddress: true,
        locationLat: true,
        locationLng: true,
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
        id: true,
        title: true,
        organiserId: true,
        startDateTime: true,
        status: true,
        locationName: true,
        locationAddress: true,
        locationLat: true,
        locationLng: true,
      },
    });

    // --- détecter changements critiques
    const timeChanged = dto.startDateTime !== undefined && before.startDateTime.toISOString() !== after.startDateTime.toISOString();

    const locChanged =
      (dto.locationName !== undefined ||
        dto.locationAddress !== undefined ||
        dto.locationLat !== undefined ||
        dto.locationLng !== undefined) &&
      locationSignature(before) !== locationSignature(after);

    const cancelled = dto.status !== undefined && before.status !== EventStatus.CANCELLED && after.status === EventStatus.CANCELLED;

    if (timeChanged || locChanged || cancelled) {
      // participants concernés : GOING ou INVITED (pas MAYBE, pas DECLINED)
      const targets = await this.prisma.eventParticipant.findMany({
        where: {
          eventId,
          status: { in: [EventParticipantStatus.GOING, EventParticipantStatus.INVITED] },
          userId: { not: null },
        },
        select: { id: true, userId: true, status: true },
      });

      if (targets.length > 0) {
        const { type, title, body, data } = this.buildCriticalChangeNotification(before, after, {
          timeChanged,
          locChanged,
          cancelled,
        });

        const rows = targets.map((p) => ({
          userId: p.userId!,
          eventId,
          type,
          title,
          body,
          data: {
            ...data,
            eventId,
            participantId: p.id,
            participantStatus: p.status,
          },
        }));

        await this.notificationsService.createMany(rows);
      }
    }

    return after; // ou ton EventDetailsResponseDto, selon ton API
  }

  private buildCriticalChangeNotification(
    before: any,
    after: any,
    flags: { timeChanged: boolean; locChanged: boolean; cancelled: boolean },
  ): { type: NotificationType; title: string; body: string; data: any } {
    const title = `Mise à jour – ${after.title}`;

    if (flags.cancelled) {
      return {
        type: NotificationType.EVENT_CANCELLED,
        title: `Annulation – ${after.title}`,
        body: `L’événement a été annulé. • Voir les détails`,
        data: { reason: 'CANCELLED', beforeStatus: before.status, afterStatus: after.status },
      };
    }

    if (flags.timeChanged && !flags.locChanged) {
      return {
        type: NotificationType.EVENT_CHANGED_TIME,
        title,
        body: `Changement d’horaire : initialement ${iso(before.startDateTime)} • nouvelle heure ${iso(after.startDateTime)} • Voir les détails`,
        data: { beforeStartDateTime: iso(before.startDateTime), afterStartDateTime: iso(after.startDateTime) },
      };
    }

    if (!flags.timeChanged && flags.locChanged) {
      return {
        type: NotificationType.EVENT_CHANGED_LOCATION,
        title,
        body:
          `Changement de lieu : initialement ${before.locationName ?? '—'} • ` +
          `nouveau lieu ${after.locationName ?? '—'} • Voir les détails`,
        data: {
          beforeLocation: {
            locationName: before.locationName,
            locationAddress: before.locationAddress,
            locationLat: before.locationLat,
            locationLng: before.locationLng,
          },
          afterLocation: {
            locationName: after.locationName,
            locationAddress: after.locationAddress,
            locationLat: after.locationLat,
            locationLng: after.locationLng,
          },
        },
      };
    }

    // Plusieurs changements → simplification
    return {
      type: NotificationType.EVENT_UPDATED,
      title,
      body: `L’événement a été mis à jour (heure/lieu). • Voir les détails`,
      data: {
        timeChanged: flags.timeChanged,
        locChanged: flags.locChanged,
        before: { startDateTime: iso(before.startDateTime), locationName: before.locationName },
        after: { startDateTime: iso(after.startDateTime), locationName: after.locationName },
      },
    };
  }

  async getPublicByCode(eventCode: string): Promise<PublicEventByCodeResponseDto> {
    const code = (eventCode ?? '').trim();
    if (!code) throw new BadRequestException('eventCode is required');

    const ev = await this.prisma.event.findUnique({
      where: { eventCode: code },
      select: {
        id: true,
        eventCode: true,
        title: true,
        startDateTime: true,
        status: true,
        locationName: true,
        locationAddress: true,
        organiser: { select: { firstName: true, lastName: true } },
      },
    });

    if (!ev) throw new NotFoundException('Event not found');

    if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.COMPLETED) {
      // MVP : on masque l'event non disponible
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
      organiser: {
        firstName: ev.organiser.firstName,
        lastName: ev.organiser.lastName,
      },
      join: {
        eventId: ev.id,
        eventCode: ev.eventCode,
      },
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

    const email = dto.email?.trim().toLowerCase();

    let user = null as null | { id: string; isGuest: boolean };

    if (email) {
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, isGuest: true },
      });

      if (existing) {
        user = existing;
      } else {
        user = await this.prisma.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() ?? null,
            isGuest: true,
            plan: UserPlan.FREE,
          },
          select: { id: true, isGuest: true },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: null,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() ?? null,
          isGuest: true,
          plan: UserPlan.FREE,
        },
        select: { id: true, isGuest: true },
      });
    }

    const existingParticipant = await this.prisma.eventParticipant.findFirst({
      where: { eventId: ev.id, userId: user.id },
      select: { id: true },
    });

    if (existingParticipant) {
      const updated = await this.prisma.eventParticipant.update({
        where: { id: existingParticipant.id },
        data: {
          role: RoleInEvent.PARTICIPANT,
          status: EventParticipantStatus.GOING,
        },
        select: { id: true },
      });

      return {
        eventId: ev.id,
        participantId: updated.id,
        userId: user.id,
        isGuest: user.isGuest,
      };
    }

    const created = await this.prisma.eventParticipant.create({
      data: {
        eventId: ev.id,
        userId: user.id,
        role: RoleInEvent.PARTICIPANT,
        status: EventParticipantStatus.GOING,
      },
      select: { id: true },
    });

    return {
      eventId: ev.id,
      participantId: created.id,
      userId: user.id,
      isGuest: user.isGuest,
    };
  }

  async runAutoCompleteEvents(now: Date) {
    const cutoff = new Date(now.getTime() - AUTO_COMPLETE_AFTER_MINUTES * 60_000);

    const res = await this.prisma.event.updateMany({
      where: {
        status: EventStatus.PLANNED,
        startDateTime: { lt: cutoff },
      },
      data: { status: EventStatus.COMPLETED },
    });

    if (res.count > 0) {
      this.logger.log(`Auto-completed events: ${res.count}`);
    }

    return { updated: res.count };
  }

  // Cron (si tu veux l’activer en prod)
  @Cron('*/10 * * * *')
  async handleAutoCompleteCron() {
    await this.runAutoCompleteEvents(new Date());
  }

  async duplicateEvent(eventId: string, currentUserId: string, dto: DuplicateEventDto) {
    const newEventId = await this.prisma.$transaction(async (tx) => {
      const src = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          organiserId: true,
          status: true,
          title: true,
          description: true,
          locationName: true,
          locationAddress: true,
          locationLat: true,
          locationLng: true,
          routes: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              routeId: true,
              name: true,
              distanceMeters: true,
              type: true,
              encodedPolyline: true,
              eventGroups: {
                orderBy: { createdAt: 'asc' },
                select: { id: true, label: true, paceMinKmh: true, paceMaxKmh: true },
              },
            },
          },
        },
      });
      if (!src) throw new NotFoundException('Event not found');
      if (src.organiserId !== currentUserId) {
        throw new ForbiddenException('Only organiser can duplicate this event.');
      }
      if (src.status !== EventStatus.COMPLETED) {
        throw new BadRequestException('Only COMPLETED events can be duplicated.');
      }
      const startDateTime = new Date(dto.startDateTime);
      if (Number.isNaN(startDateTime.getTime())) {
        throw new BadRequestException('Invalid startDateTime');
      }

      const eventCode = await this.generateUniqueEventCode();

      const newEvent = await tx.event.create({
        data: {
          organiserId: src.organiserId,
          status: EventStatus.PLANNED,
          startDateTime: new Date(dto.startDateTime),

          title: dto.title ?? src.title,
          description: dto.description ?? src.description,

          locationName: dto.locationName ?? src.locationName,
          locationAddress: dto.locationAddress ?? src.locationAddress,
          locationLat: dto.locationLat ?? src.locationLat,
          locationLng: dto.locationLng ?? src.locationLng,

          eventCode,
        },
        select: { id: true },
      });
      await this.eventParticipantService.createOrganiserParticipant(newEvent.id, src.organiserId, tx);
      const routeIdMap = new Map<string, string>();

      for (const r of src.routes) {
        const createdRoute = await tx.eventRoute.create({
          data: {
            eventId: newEvent.id,
            routeId: r.routeId ?? null,
            name: r.name,
            distanceMeters: r.distanceMeters,
            type: r.type ?? null,
            encodedPolyline: r.encodedPolyline,
          },
          select: { id: true },
        });

        routeIdMap.set(r.id, createdRoute.id);

        const wantAll = dto.copyAllGroups === true;
        const wantSelect = Array.isArray(dto.groupIds) && dto.groupIds.length > 0;

        if (wantAll || wantSelect) {
          const srcGroups = await tx.eventGroup.findMany({
            where: wantAll ? { eventRoute: { eventId: src.id } } : { id: { in: dto.groupIds! } },
            select: {
              id: true,
              label: true,
              paceMinKmh: true,
              paceMaxKmh: true,
              eventRouteId: true,
              eventRoute: { select: { eventId: true } },
            },
            orderBy: { createdAt: 'asc' },
          });

          if (wantSelect) {
            const bad = srcGroups.find((g) => g.eventRoute.eventId !== src.id);
            if (bad) {
              throw new BadRequestException('Some groupIds do not belong to source event');
            }
          }
          const data = srcGroups
            .map((g) => {
              const newEventRouteId = routeIdMap.get(g.eventRouteId);
              if (!newEventRouteId) return null;
              return {
                eventRouteId: newEventRouteId,
                label: g.label,
                paceMinKmh: g.paceMinKmh,
                paceMaxKmh: g.paceMaxKmh,
              };
            })
            .filter(Boolean) as Array<{ eventRouteId: string; label: string; paceMinKmh: number | null; paceMaxKmh: number | null }>;

          if (data.length > 0) {
            await tx.eventGroup.createMany({ data });
          }
        }
      }
      return newEvent.id;
    });
    return this.getEventDetails(newEventId, currentUserId);
  }
}
