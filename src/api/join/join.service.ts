import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { JoinEventSummaryDto } from './dto/join-event-summary.dto';
import { EventParticipantStatus, RoleInEvent } from '@prisma/client';
import { JoinParticipateResponseDto } from './dto/join-participate-response.dto';

@Injectable()
export class JoinService {
  constructor(private readonly prisma: PrismaService) {}

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

  async participate(eventCode: string, userId: string): Promise<JoinParticipateResponseDto> {
    const code = eventCode.trim();

    const event = await this.prisma.event.findFirst({
      where: { eventCode: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });

    if (!event) throw new NotFoundException('Event not found');

    const existing = await this.prisma.eventParticipant.findFirst({
      where: { eventId: event.id, userId },
    });

    if (existing) {
      const updated = await this.prisma.eventParticipant.update({
        where: { id: existing.id },
        data: {
          status: EventParticipantStatus.GOING,
        },
      });

      return {
        participantId: updated.id,
        eventId: updated.eventId,
        userId: updated.userId!,
        role: updated.role,
        status: 'GOING' as const,
      };
    }

    const created = await this.prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId,
        status: EventParticipantStatus.GOING,
        role: RoleInEvent.PARTICIPANT,
      },
    });

    return {
      participantId: created.id,
      eventId: created.eventId,
      userId: created.userId!,
      role: created.role,
      status: 'GOING' as const,
    };
  }
}
