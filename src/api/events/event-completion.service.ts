import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, EventStatus } from '@/common/enums';
import { Prisma } from '@prisma/client';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';
import { EventsService } from './events.service';

const AUTO_COMPLETE_AFTER_MINUTES = 240;
const DEFAULT_ROUTE_RADIUS_METERS = 3000;

@Injectable()
export class EventCompletionService {
  private readonly logger = new Logger(EventCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Publish inline event routes to the route library on completion.
   */
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

    const centerLat = input.centerLat ?? 0;
    const centerLng = input.centerLng ?? 0;

    for (const er of eventRoutes) {
      if (er.routeId) {
        skippedCount += 1;
        continue;
      }

      if (!er.encodedPolyline || er.encodedPolyline.trim().length === 0) {
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

  async completeEvent(eventId: string, currentUserId: string): Promise<EventDetailsResponseDto> {
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
      if (!event) throw new NotFoundException('Event not found');
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

    return this.eventsService.getEventDetails(eventId, currentUserId);
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

  @Cron('*/10 * * * *')
  async handleAutoCompleteCron() {
    await this.runAutoCompleteEvents(new Date());
  }
}
