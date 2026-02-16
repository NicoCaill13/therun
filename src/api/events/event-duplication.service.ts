import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventStatus } from '@/common/enums';
import { DuplicateEventDto } from './dto/duplicate-event.dto';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';
import { EventCodeService } from './event-code.service';
import { EventParticipantsService } from '../event-participants/event-participants.service';
import { EventsService } from './events.service';

@Injectable()
export class EventDuplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventCodeService: EventCodeService,
    private readonly eventParticipantsService: EventParticipantsService,
    private readonly eventsService: EventsService,
  ) {}

  async duplicateEvent(eventId: string, currentUserId: string, dto: DuplicateEventDto): Promise<EventDetailsResponseDto> {
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

      const eventCode = await this.eventCodeService.generateUniqueEventCode();

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

      await this.eventParticipantsService.createOrganiserParticipant(newEvent.id, src.organiserId, tx);

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

    return this.eventsService.getEventDetails(newEventId, currentUserId);
  }
}
