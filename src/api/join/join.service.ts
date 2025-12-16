import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { JoinEventSummaryDto } from './dto/join-event-summary.dto';

@Injectable()
export class JoinService {
  constructor(private readonly prisma: PrismaService) { }

  async resolveEventByCode(eventCode: string): Promise<JoinEventSummaryDto> {
    const code = eventCode.trim();

    const event = await this.prisma.event.findFirst({
      where: { eventCode: { equals: code, mode: 'insensitive' } },
      select: {
        id: true,
        title: true,
        startDateTime: true,
        locationName: true,
        locationLat: true,
        locationLng: true,
        organiser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      eventId: event.id,
      title: event.title,
      startDateTime: event.startDateTime,
      locationName: event.locationName ?? null,
      locationLat: event.locationLat ?? null,
      locationLng: event.locationLng ?? null,
      organiserId: event.organiser.id,
      organiserFirstName: event.organiser.firstName,
      organiserLastName: event.organiser.lastName ?? null,
    };
  }
}
