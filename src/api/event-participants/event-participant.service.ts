import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent } from '@prisma/client';

@Injectable()
export class EventParticipantService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Retourne tous les participants d’un event, avec le user joint.
   */

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
}
