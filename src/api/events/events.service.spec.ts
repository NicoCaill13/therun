import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { EventParticipantsService } from '../event-participants/event-participants.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventStatus, UserPlan } from '@prisma/client';

describe('EventsService', () => {
  let service: EventsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    eventParticipant: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockEventParticipantsService = {
    createOrganiserParticipant: jest.fn(),
  };

  const mockNotificationsService = {
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventParticipantsService, useValue: mockEventParticipantsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get(PrismaService);
  });

  describe('createForOrganiser', () => {
    const premiumUserId = 'premium-user-id';
    const freeUserId = 'free-user-id';
    const createEventDto = {
      title: 'Test Event',
      startDateTime: '2026-02-01T18:00:00.000Z',
      description: 'A test event',
      locationName: 'Test Location',
    };

    it('should create an event for a PREMIUM user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: premiumUserId, plan: UserPlan.PREMIUM });
      mockPrisma.event.findUnique.mockResolvedValue(null); // No collision for eventCode
      mockPrisma.event.create.mockResolvedValue({
        id: 'new-event-id',
        ...createEventDto,
        eventCode: 'ABC123',
        status: EventStatus.PLANNED,
        organiserId: premiumUserId,
      });
      mockEventParticipantsService.createOrganiserParticipant.mockResolvedValue({});

      const result = await service.createForOrganiser(premiumUserId, createEventDto);

      expect(result.id).toBe('new-event-id');
      expect(result.eventCode).toBeTruthy();
      expect(mockEventParticipantsService.createOrganiserParticipant).toHaveBeenCalledWith('new-event-id', premiumUserId);
    });

    it('should throw ForbiddenException for FREE user with existing event this week', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: freeUserId, plan: UserPlan.FREE });
      mockPrisma.event.count.mockResolvedValue(1); // Already has 1 event this week

      await expect(service.createForOrganiser(freeUserId, createEventDto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow FREE user to create event if no events this week', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: freeUserId, plan: UserPlan.FREE });
      mockPrisma.event.count.mockResolvedValue(0); // No events this week
      mockPrisma.event.findUnique.mockResolvedValue(null);
      mockPrisma.event.create.mockResolvedValue({
        id: 'new-event-id',
        ...createEventDto,
        eventCode: 'XYZ789',
        status: EventStatus.PLANNED,
        organiserId: freeUserId,
      });
      mockEventParticipantsService.createOrganiserParticipant.mockResolvedValue({});

      const result = await service.createForOrganiser(freeUserId, createEventDto);

      expect(result.id).toBe('new-event-id');
    });
  });

  describe('getEventDetails', () => {
    it('should throw NotFoundException if event does not exist', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.getEventDetails('non-existent-id', 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should return event details with participants', async () => {
      const mockEvent = {
        id: 'event-id',
        title: 'Test Event',
        description: 'Description',
        startDateTime: new Date(),
        status: EventStatus.PLANNED,
        eventCode: 'ABC123',
        locationName: 'Location',
        locationAddress: null,
        locationLat: null,
        locationLng: null,
        completedAt: null,
        goingCountAtCompletion: null,
        organiser: {
          id: 'organiser-id',
          firstName: 'John',
          lastName: 'Doe',
        },
        participants: [
          {
            userId: 'organiser-id',
            role: 'ORGANISER',
            status: 'GOING',
            eventRouteId: null,
            eventGroupId: null,
            user: { firstName: 'John', lastName: 'Doe' },
          },
        ],
      };

      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      const result = await service.getEventDetails('event-id', 'organiser-id');

      expect(result.event.id).toBe('event-id');
      expect(result.organiser.displayName).toBe('John Doe');
      expect(result.participants).toHaveLength(1);
    });
  });

  describe('getPublicByCode', () => {
    it('should throw BadRequestException if eventCode is empty', async () => {
      await expect(service.getPublicByCode('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.getPublicByCode('INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if event is CANCELLED', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: 'event-id',
        status: EventStatus.CANCELLED,
      });

      await expect(service.getPublicByCode('ABC123')).rejects.toThrow(NotFoundException);
    });
  });
});
