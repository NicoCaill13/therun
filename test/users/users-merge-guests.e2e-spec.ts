import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { clearAll, createE2eApp, seedUser } from '../e2e-utils';
import { EventParticipantStatus, EventStatus, RoleInEvent, UserPlan } from '@prisma/client';
import { UserService } from '@/api/users/user.service';

describe('S6.1.3 — mergeGuestsByEmail (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let users: UserService;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    users = app.get(UserService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAll(prisma);
  });

  it('merge : réassigne sans doublon + dédupe quand (eventId, realUserId) existe déjà + idempotent', async () => {
    const organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Org' });

    const eventA = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'A',
        startDateTime: new Date('2030-01-01T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'EVTA01',
      },
    });

    const eventB = await prisma.event.create({
      data: {
        organiserId: organiser.id,
        title: 'B',
        startDateTime: new Date('2030-01-02T12:00:00.000Z'),
        status: EventStatus.PLANNED,
        eventCode: 'EVTB01',
      },
    });

    const real = await prisma.user.create({
      data: {
        email: 'real@mail.com',
        firstName: 'Real',
        isGuest: false,
        acceptedTermsAt: new Date(),
        plan: UserPlan.FREE,
      },
    });

    // ✅ 1 seul guest possible avec cet email (email est @unique)
    const guest = await prisma.user.create({
      data: {
        email: 'runner@mail.com',
        firstName: 'G',
        isGuest: true,
        plan: UserPlan.FREE,
      },
    });

    await prisma.eventParticipant.createMany({
      data: [
        { eventId: eventA.id, userId: guest.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: eventB.id, userId: guest.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
        { eventId: eventB.id, userId: real.id, role: RoleInEvent.PARTICIPANT, status: EventParticipantStatus.GOING },
      ],
    });

    // Run #1
    const r1 = await users.mergeGuestsByEmail('runner@mail.com', real.id);

    expect(r1.mergedGuestsCount).toBe(1);
    expect(r1.reassignedParticipantsCount).toBe(1); // eventA
    expect(r1.dedupedParticipantsCount).toBe(1); // eventB

    // Vérifie : real a 1 participation sur A et B
    const realParts = await prisma.eventParticipant.findMany({
      where: { userId: real.id },
      select: { eventId: true },
    });

    const evIds = realParts.map((p) => p.eventId);
    expect(evIds).toContain(eventA.id);
    expect(evIds).toContain(eventB.id);

    // Vérifie : guest n'a plus aucune participation
    const guestParts = await prisma.eventParticipant.count({ where: { userId: guest.id } });
    expect(guestParts).toBe(0);

    // Run #2 (idempotent)
    const r2 = await users.mergeGuestsByEmail('runner@mail.com', real.id);

    // mergedGuestsCount peut rester à 1 (guest existe toujours), mais aucun mouvement
    expect(r2.mergedGuestsCount).toBe(1);
    expect(r2.reassignedParticipantsCount).toBe(0);
    expect(r2.dedupedParticipantsCount).toBe(0);
  });

  it('préconditions: realUserId inexistant -> 404', async () => {
    await expect(users.mergeGuestsByEmail('x@y.com', 'user_xxx')).rejects.toBeTruthy();
  });

  it('préconditions: realUser est guest -> 400', async () => {
    const guest = await prisma.user.create({
      data: { email: 'x@y.com', firstName: 'G', isGuest: true, plan: UserPlan.FREE },
    });

    await expect(users.mergeGuestsByEmail('x@y.com', guest.id)).rejects.toBeTruthy();
  });

  it('préconditions: email vide -> 400', async () => {
    const real = await prisma.user.create({
      data: { email: 'real@y.com', firstName: 'R', isGuest: false, acceptedTermsAt: new Date(), plan: UserPlan.FREE },
    });

    await expect(users.mergeGuestsByEmail('   ', real.id)).rejects.toBeTruthy();
  });
});
