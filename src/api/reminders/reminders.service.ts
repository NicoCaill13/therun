import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, NotificationType } from '@prisma/client';

const OFFSET_MINUTES = 120;
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
    await this.runParticipantReminders(new Date());
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
}
