import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser } from '../e2e-utils';
import { EventParticipantStatus, EventStatus, RoleInEvent, UserPlan, NotificationType } from '@prisma/client';
import { RemindersService } from '@/api/reminders/reminders.service';

describe('Participant reminders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let reminders: RemindersService;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;

    reminders = app.get(RemindersService);

    await clearAll(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crée un rappel pour GOING uniquement, à H-2, ignore CANCELLED/COMPLETED, et reste idempotent', async () => {
    const now = new Date('2030-01-01T10:00:00.000Z');

    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    const uGoing = await seedUser(prisma, UserPlan.FREE, { firstName: 'Going' });
    const uInvited = await seedUser(prisma, UserPlan.FREE, { firstName: 'Inv' });
    const uDeclined = await seedUser(prisma, UserPlan.FREE, { firstName: 'Dec' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie du midi',
        startDateTime: new Date('2030-01-01T12:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'REM001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    const cancelledEvent = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Annulée',
        startDateTime: new Date('2030-01-01T12:06:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'REM_CAN_001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    const completedEvent = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Terminée',
        startDateTime: new Date('2030-01-01T12:07:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: 'REM_COM_001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: event.id, userId: uGoing.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: event.id, userId: uInvited.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
        { eventId: event.id, userId: uDeclined.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.DECLINED },

        { eventId: cancelledEvent.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: cancelledEvent.id, userId: uGoing.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },

        { eventId: completedEvent.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: completedEvent.id, userId: uGoing.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
      ],
    });

    const r1 = await reminders.runParticipantReminders(now);

    expect(r1.created).toBeGreaterThanOrEqual(2);

    const notifs1 = await prisma.notification.findMany({
      where: { eventId: event.id, type: NotificationType.EVENT_REMINDER_PARTICIPANT },
      orderBy: { createdAt: 'asc' },
    });

    expect(notifs1.length).toBe(2);

    const userIds = notifs1.map((n) => n.userId);
    expect(userIds).toContain(organiser.id);
    expect(userIds).toContain(uGoing.id);
    expect(userIds).not.toContain(uInvited.id);
    expect(userIds).not.toContain(uDeclined.id);

    for (const n of notifs1) {
      expect(n.dedupKey).toBe(`event:${event.id}:reminder:participant`);
    }

    const ignoredCount = await prisma.notification.count({
      where: {
        type: NotificationType.EVENT_REMINDER_PARTICIPANT,
        eventId: { in: [cancelledEvent.id, completedEvent.id] },
      },
    });
    expect(ignoredCount).toBe(0);

    const r2 = await reminders.runParticipantReminders(now);
    expect(r2.created).toBe(0);

    const notifs2 = await prisma.notification.findMany({
      where: { eventId: event.id, type: NotificationType.EVENT_REMINDER_PARTICIPANT },
    });
    expect(notifs2.length).toBe(notifs1.length);
  });
});
