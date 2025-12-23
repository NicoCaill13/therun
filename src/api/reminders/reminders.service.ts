import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, NotificationType } from '@prisma/client';

const OFFSET_MINUTES = 120;
const ORGANISER_OFFSET_MINUTES = 180;
const WINDOW_MINUTES = 10;

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private readonly prisma: PrismaService) { }

  @Cron('*/10 * * * *')
  async handleCron() {
    const now = new Date();
    await this.runParticipantReminders(now);
    await this.runOrganiserReminders(now);
  }

  async runParticipantReminders(now: Date) {
    // Cherche les events qui démarrent entre now+120 et now+130
    const startMin = addMinutes(now, OFFSET_MINUTES);
    const startMax = addMinutes(now, OFFSET_MINUTES + WINDOW_MINUTES);

    const events = await this.prisma.event.findMany({
      where: {
        startDateTime: { gte: startMin, lt: startMax },
      },
      select: {
        id: true,
        title: true,
        startDateTime: true,
        locationName: true,
        locationAddress: true,
      },
    });

    let created = 0;

    for (const ev of events) {
      const participants = await this.prisma.eventParticipant.findMany({
        where: {
          eventId: ev.id,
          status: EventParticipantStatus.GOING,
          userId: { not: null }, // ✅ pas de rappel si pas de userId
        },
        include: {
          eventRoute: { select: { name: true, distanceMeters: true } },
          eventGroup: { select: { label: true } },
        },
      });

      if (participants.length === 0) continue;
      const dedupKey = `event:${ev.id}:reminder:participant`;
      const rows = participants.map((p) => {
        const routeTxt = p.eventRoute ? `${p.eventRoute.name} (${p.eventRoute.distanceMeters}m)` : null;
        const groupTxt = p.eventGroup ? p.eventGroup.label : null;

        const bodyParts = [
          `Départ: ${ev.startDateTime.toISOString()}`,
          ev.locationName ? `Lieu: ${ev.locationName}` : null,
          ev.locationAddress ? `Adresse: ${ev.locationAddress}` : null,
          routeTxt ? `Parcours: ${routeTxt}` : null,
          groupTxt ? `Groupe: ${groupTxt}` : null,
        ].filter(Boolean);

        return {
          userId: p.userId!,
          eventId: ev.id,
          type: NotificationType.EVENT_REMINDER_PARTICIPANT,
          title: `Rappel – ${ev.title}`,
          body: bodyParts.join(' • '),
          data: {
            eventId: ev.id,
            participantId: p.id,
            eventRouteId: p.eventRouteId ?? null,
            eventGroupId: p.eventGroupId ?? null,
          },
          dedupKey,
        };
      });

      const res = await this.prisma.notification.createMany({
        data: rows,
        skipDuplicates: true, // ✅ respecte @@unique = idempotent
      });

      created += res.count;
    }

    this.logger.log(`Participant reminders created: ${created}`);
    return { created };
  }

  async runOrganiserReminders(now: Date) {
    const startMin = addMinutes(now, ORGANISER_OFFSET_MINUTES);
    const startMax = addMinutes(now, ORGANISER_OFFSET_MINUTES + WINDOW_MINUTES);

    const events = await this.prisma.event.findMany({
      where: { startDateTime: { gte: startMin, lt: startMax } },
      select: {
        id: true,
        title: true,
        startDateTime: true,
        locationName: true,
        locationAddress: true,
        organiserId: true,
      },
    });

    let created = 0;

    for (const ev of events) {
      // MVP rule: envoyer seulement si goingCount >= 1 (hors organisateur ça dépend, mais on compte GOING total)
      const [goingCount, invitedCount, maybeCount] = await Promise.all([
        this.prisma.eventParticipant.count({ where: { eventId: ev.id, status: EventParticipantStatus.GOING } }),
        this.prisma.eventParticipant.count({ where: { eventId: ev.id, status: EventParticipantStatus.INVITED } }),
        this.prisma.eventParticipant.count({ where: { eventId: ev.id, status: EventParticipantStatus.MAYBE } }),
      ]);

      if (goingCount < 1) continue;

      // distributions GOING
      const routes = await this.prisma.eventRoute.findMany({
        where: { eventId: ev.id },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      });

      const goingByRoute = await this.prisma.eventParticipant.groupBy({
        by: ['eventRouteId'],
        where: { eventId: ev.id, status: EventParticipantStatus.GOING, eventRouteId: { not: null } },
        _count: { _all: true },
      });

      const byRoute = routes.map((r) => ({
        eventRouteId: r.id,
        name: r.name,
        goingCount: goingByRoute.find((x) => x.eventRouteId === r.id)?._count._all ?? 0,
      }));

      const groups = await this.prisma.eventGroup.findMany({
        where: { eventRoute: { eventId: ev.id } },
        select: { id: true, label: true },
        orderBy: { createdAt: 'asc' },
      });

      const goingByGroup = await this.prisma.eventParticipant.groupBy({
        by: ['eventGroupId'],
        where: { eventId: ev.id, status: EventParticipantStatus.GOING, eventGroupId: { not: null } },
        _count: { _all: true },
      });

      const byGroup = groups.map((g) => ({
        eventGroupId: g.id,
        label: g.label,
        goingCount: goingByGroup.find((x) => x.eventGroupId === g.id)?._count._all ?? 0,
      }));

      const title = `Rappel organisateur – ${ev.title}`;
      const body = [
        `Départ: ${ev.startDateTime.toISOString()}`,
        ev.locationName ? `Lieu: ${ev.locationName}` : null,
        ev.locationAddress ? `Adresse: ${ev.locationAddress}` : null,
        `GOING: ${goingCount}`,
        `INVITED: ${invitedCount}`,
        `MAYBE: ${maybeCount}`,
      ]
        .filter(Boolean)
        .join(' • ');

      const dedupKey = `event:${ev.id}:reminder:organiser`;
      const res = await this.prisma.notification.createMany({
        data: [
          {
            userId: ev.organiserId,
            eventId: ev.id,
            type: NotificationType.EVENT_REMINDER_ORGANISER,
            title,
            body,
            data: {
              eventId: ev.id,
              goingCount,
              invitedCount,
              maybeCount,
              byRoute,
              byGroup,
            },
            dedupKey,
          },
        ],
        skipDuplicates: true,
      });

      created += res.count;
    }

    this.logger.log(`Organiser reminders created: ${created}`);
    return { created };
  }
}
