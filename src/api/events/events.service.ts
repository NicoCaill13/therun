// src/events/events.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventStatus, UserPlan } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) { }

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
      throw new ForbiddenException(
        'Limite The Run Free atteinte : 1 événement actif par semaine. Passe en Premium pour en créer plus.',
      );
    }
  }

  async createForOrganiser(organiserId: string, dto: CreateEventDto) {
    await this.assertCanCreateEventForUser(organiserId);

    const eventCode = await this.generateUniqueEventCode();

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        startDateTime: new Date(dto.startDateTime),
        status: EventStatus.PLANNED,
        organiserId,
        locationName: dto.locationName,
        locationAddress: dto.locationAddress,
        locationLat: dto.locationLat,
        locationLng: dto.locationLng,
        eventCode,
        // IMPORTANT MVP-4 : ajouter aussi une ligne EventParticipant ORGANISER ici plus tard
      },
    });

    return event;
  }

  async findMyEvents(organiserId: string, scope: 'future' | 'past') {
    const now = new Date();

    if (scope === 'future') {
      return this.prisma.event.findMany({
        where: {
          organiserId,
          status: EventStatus.PLANNED,
          startDateTime: {
            gte: now,
          },
        },
        orderBy: { startDateTime: 'asc' },
      });
    }

    // past: COMPLETED + éventuellement CANCELLED, date passée
    return this.prisma.event.findMany({
      where: {
        organiserId,
        startDateTime: {
          lt: now,
        },
        status: {
          in: [EventStatus.COMPLETED, EventStatus.CANCELLED],
        },
      },
      orderBy: { startDateTime: 'desc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        routes: true, // utile plus tard, pour l’instant ok
        participants: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async update(organiserId: string, id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: { organiserId: true, status: true },
    });

    if (!existing) throw new NotFoundException('Event not found');
    if (existing.organiserId !== organiserId) {
      throw new ForbiddenException('Not event organiser');
    }
    if (existing.status !== EventStatus.PLANNED) {
      throw new ForbiddenException('Only PLANNED events can be edited');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        startDateTime: dto.startDateTime
          ? new Date(dto.startDateTime)
          : undefined,
        locationName: dto.locationName ?? undefined,
        locationAddress: dto.locationAddress ?? undefined,
        locationLat: dto.locationLat ?? undefined,
        locationLng: dto.locationLng ?? undefined,
      },
    });
  }

  async updateStatus(
    organiserId: string,
    id: string,
    dto: UpdateEventStatusDto,
  ) {
    const existing = await this.prisma.event.findUnique({
      where: { id },
      select: { organiserId: true, status: true },
    });

    if (!existing) throw new NotFoundException('Event not found');
    if (existing.organiserId !== organiserId) {
      throw new ForbiddenException('Not event organiser');
    }

    // Règles simples MVP : on ne repasse pas de COMPLETED/CANCELLED à PLANNED
    if (
      existing.status !== EventStatus.PLANNED &&
      dto.status === EventStatus.PLANNED
    ) {
      throw new ForbiddenException('Cannot revert an event to PLANNED');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }
}
