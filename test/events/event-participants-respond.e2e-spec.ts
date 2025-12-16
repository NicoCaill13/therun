import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantStatus, RoleInEvent, UserPlan } from '@prisma/client';
import { createE2eApp, seedUser, makeJwtToken } from '../e2e-utils';

describe('EventParticipantsController – POST /events/:eventId/participants/:participantId/respond (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let organiser: any;

  let invitedUser: any;
  let invitedUserToken: string;

  let otherUser: any;
  let otherUserToken: string;

  let event: any;
  let participant: any;

  beforeAll(async () => {
    const ctx = await createE2eApp();
    app = ctx.app;
    prisma = ctx.prisma;
    const jwtService = ctx.jwtService;

    await prisma.eventParticipant.deleteMany();
    await prisma.eventGroup.deleteMany();
    await prisma.eventRoute.deleteMany();
    await prisma.route.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    organiser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Organiser' });

    invitedUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Invited' });
    invitedUserToken = makeJwtToken(jwtService, invitedUser.id, invitedUser.email, UserPlan.FREE);

    otherUser = await seedUser(prisma, UserPlan.FREE, { firstName: 'Other' });
    otherUserToken = makeJwtToken(jwtService, otherUser.id, otherUser.email, UserPlan.FREE);

    event = await prisma.event.create({
      data: {
        title: 'Run du jeudi',
        startDateTime: new Date('2026-01-01T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: `EVT${Math.random().toString(16).slice(2, 10)}`,
      },
    });

    participant = await prisma.eventParticipant.create({
      data: {
        eventId: event.id,
        userId: invitedUser.id,
        role: RoleInEvent.PARTICIPANT,
        status: EventParticipantStatus.INVITED,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const postRespond = (token: string, eventId: string, participantId: string, body: any) => {
    return request(app.getHttpServer())
      .post(`/events/${eventId}/participants/${participantId}/respond`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  };

  it('401 si pas de token', async () => {
    await request(app.getHttpServer())
      .post(`/events/${event.id}/participants/${participant.id}/respond`)
      .send({ status: 'GOING' })
      .expect(401);
  });

  it('400 si payload invalide (status manquant)', async () => {
    const res = await postRespond(invitedUserToken, event.id, participant.id, {}).expect(400);
    expect(res.body.message.join(' | ')).toContain('status');
  });

  it('400 si payload invalide (status incorrect)', async () => {
    const res = await postRespond(invitedUserToken, event.id, participant.id, { status: 'MAYBE' }).expect(400);
    expect(res.body.message.join(' | ')).toContain('status');
  });

  it('404 si eventId inexistant', async () => {
    const res = await postRespond(invitedUserToken, 'evt-does-not-exist', participant.id, { status: 'GOING' }).expect(404);
    expect(res.body.message).toBe('Event not found');
  });

  it('404 si participantId inexistant', async () => {
    const res = await postRespond(invitedUserToken, event.id, 'part-does-not-exist', { status: 'GOING' }).expect(404);
    expect(res.body.message).toBe('Participant not found');
  });

  it('404 si participant.eventId != eventId', async () => {
    const otherEvent = await prisma.event.create({
      data: {
        title: 'Other',
        startDateTime: new Date('2026-01-02T18:00:00.000Z'),
        organiserId: organiser.id,
        eventCode: `EVT${Math.random().toString(16).slice(2, 10)}`,
      },
    });

    const res = await postRespond(invitedUserToken, otherEvent.id, participant.id, { status: 'GOING' }).expect(404);
    expect(res.body.message).toBe('Participant not found');
  });

  it("403 si l'utilisateur répond à l'invitation de quelqu'un d'autre", async () => {
    const res = await postRespond(otherUserToken, event.id, participant.id, { status: 'GOING' }).expect(403);
    expect(res.body.message).toBe('You can only respond to your own invitation');
  });

  it('204 si réponse GOING (participant.status passe à GOING)', async () => {
    // Reset status INVITED pour ce test
    await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { status: EventParticipantStatus.INVITED },
    });

    await postRespond(invitedUserToken, event.id, participant.id, { status: 'GOING' }).expect(200);

    const inDb = await prisma.eventParticipant.findUnique({ where: { id: participant.id } });
    expect(inDb?.status).toBe(EventParticipantStatus.GOING);
  });

  it('409 si invitation déjà traitée (status != INVITED)', async () => {
    // statut déjà GOING
    await prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { status: EventParticipantStatus.GOING },
    });

    const res = await postRespond(invitedUserToken, event.id, participant.id, { status: 'DECLINED' }).expect(409);
    expect(res.body.message).toBe('Invitation already handled');
  });
});
