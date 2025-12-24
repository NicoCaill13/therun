import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser } from '../e2e-utils';
import { EventParticipantStatus, EventStatus, RoleInEvent, UserPlan, NotificationType, RouteType } from '@prisma/client';
import { RemindersService } from '@/api/reminders/reminders.service';

describe('S5.2.2 – Organiser reminder with summary (e2e)', () => {
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

  it('crée 1 rappel organisateur à H-3 si goingCount>=1, avec distribution, ignore CANCELLED/COMPLETED, et idempotent', async () => {
    const now = new Date('2030-01-01T10:00:00.000Z');

    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });
    const uGoingA = await seedUser(prisma, UserPlan.FREE, { firstName: 'A' });
    const uInv = await seedUser(prisma, UserPlan.FREE, { firstName: 'Inv' });

    // Event PLANNED dans la fenêtre H-3 => DOIT créer
    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Sortie soir',
        startDateTime: new Date('2030-01-01T13:05:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ORG001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    // Events CANCELLED/COMPLETED dans la même fenêtre => DOIVENT être ignorés
    const cancelledEvent = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Annulée',
        startDateTime: new Date('2030-01-01T13:06:00.000Z'),
        status: EventStatus.CANCELLED,
        eventCode: 'ORG_CAN_001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    const completedEvent = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Terminée',
        startDateTime: new Date('2030-01-01T13:07:00.000Z'),
        status: EventStatus.COMPLETED,
        eventCode: 'ORG_COM_001',
        locationName: 'Parc',
        locationAddress: 'Rue X',
      },
    });

    // Route + Group (distribution)
    const routeA = await prisma.eventRoute.create({
      data: {
        eventId: event.id,
        routeId: null,
        name: '8k',
        distanceMeters: 8000,
        type: RouteType.ROUTE,
        encodedPolyline: 'poly',
      },
    });

    const groupA = await prisma.eventGroup.create({
      data: { eventRouteId: routeA.id, label: '10-11' },
    });

    // Participants pour event PLANNED
    await prisma.eventParticipant.createMany({
      data: [
        { eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        {
          eventId: event.id,
          userId: uGoingA.id,
          role: RoleInEvent.PARTICIPANT,
          status: EventParticipantStatus.GOING,
          eventRouteId: routeA.id,
          eventGroupId: groupA.id,
        },
        { eventId: event.id, userId: uInv.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.INVITED },
      ],
    });

    // Participants pour CANCELLED/COMPLETED (GOING) => si le filtre status manque, ça créerait des notifs
    await prisma.eventParticipant.createMany({
      data: [
        { eventId: cancelledEvent.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: cancelledEvent.id, userId: uGoingA.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: completedEvent.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.GOING },
        { eventId: completedEvent.id, userId: uGoingA.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
      ],
    });

    // Run #1
    const r1 = await reminders.runOrganiserReminders(now);
    expect(r1.created).toBe(1);

    const notif = await prisma.notification.findFirst({
      where: { eventId: event.id, type: NotificationType.EVENT_REMINDER_ORGANISER, userId: organiser.id },
    });
    expect(notif).toBeTruthy();

    // ✅ dedupKey (idempotence)
    expect(notif!.dedupKey).toBe(`event:${event.id}:reminder:organiser`);

    const data: any = notif!.data;
    expect(data.goingCount).toBe(2);
    expect(data.invitedCount).toBe(1);
    expect(data.maybeCount).toBe(0);

    expect(data.byRoute).toBeDefined();
    const br = data.byRoute.find((x: any) => x.eventRouteId === routeA.id);
    expect(br.goingCount).toBe(1); // uGoingA (organiser n’a pas de route)

    expect(data.byGroup).toBeDefined();
    const bg = data.byGroup.find((x: any) => x.eventGroupId === groupA.id);
    expect(bg.goingCount).toBe(1);

    // ✅ ignore CANCELLED/COMPLETED
    const ignoredCount = await prisma.notification.count({
      where: {
        type: NotificationType.EVENT_REMINDER_ORGANISER,
        eventId: { in: [cancelledEvent.id, completedEvent.id] },
      },
    });
    expect(ignoredCount).toBe(0);

    // Run #2 idempotence
    const r2 = await reminders.runOrganiserReminders(now);
    expect(r2.created).toBe(0);

    const countAfter = await prisma.notification.count({
      where: { eventId: event.id, type: NotificationType.EVENT_REMINDER_ORGANISER, userId: organiser.id },
    });
    expect(countAfter).toBe(1);
  });

  it("n'envoie pas si goingCount < 1", async () => {
    const now = new Date('2030-02-01T10:00:00.000Z');
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org2' });

    const event = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'Vide',
        startDateTime: new Date('2030-02-01T13:02:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'ORG002',
      },
    });

    // aucun participant GOING
    await prisma.eventParticipant.createMany({
      data: [{ eventId: event.id, userId: organiser.id, role: RoleInEvent.ORGANISER, status: EventParticipantStatus.INVITED }],
    });

    const r = await reminders.runOrganiserReminders(now);
    expect(r.created).toBe(0);

    const notif = await prisma.notification.findFirst({
      where: { eventId: event.id, type: NotificationType.EVENT_REMINDER_ORGANISER },
    });
    expect(notif).toBeNull();
  });
});
