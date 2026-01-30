import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);
  });

  describe('createOne', () => {
    it('should create a notification', async () => {
      const input = {
        userId: 'user-id',
        type: NotificationType.EVENT_BROADCAST,
        title: 'Test Title',
        body: 'Test Body',
        eventId: 'event-id',
      };

      const mockNotification = {
        id: 'notif-id',
        ...input,
        data: null,
        readAt: null,
        createdAt: new Date(),
        dedupKey: null,
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createOne(input);

      expect(result.id).toBe('notif-id');
      expect(result.type).toBe(NotificationType.EVENT_BROADCAST);
      expect(result.title).toBe('Test Title');
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          type: NotificationType.EVENT_BROADCAST,
        }),
      });
    });
  });

  describe('createMany', () => {
    it('should return 0 if inputs array is empty', async () => {
      const result = await service.createMany([]);

      expect(result.createdCount).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('should create multiple notifications', async () => {
      const inputs = [
        {
          userId: 'user-1',
          type: NotificationType.EVENT_REMINDER_PARTICIPANT,
          title: 'Reminder 1',
          body: 'Body 1',
        },
        {
          userId: 'user-2',
          type: NotificationType.EVENT_REMINDER_PARTICIPANT,
          title: 'Reminder 2',
          body: 'Body 2',
        },
      ];

      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createMany(inputs);

      expect(result.createdCount).toBe(2);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([expect.objectContaining({ userId: 'user-1' }), expect.objectContaining({ userId: 'user-2' })]),
        skipDuplicates: true,
      });
    });

    it('should skip duplicates with dedupKey', async () => {
      const inputs = [
        {
          userId: 'user-1',
          type: NotificationType.EVENT_REMINDER_PARTICIPANT,
          title: 'Reminder',
          body: 'Body',
          dedupKey: 'event:1:reminder:participant',
        },
      ];

      mockPrisma.notification.createMany.mockResolvedValue({ count: 0 }); // Duplicate skipped

      const result = await service.createMany(inputs);

      expect(result.createdCount).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFoundException if notification does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('user-id', 'non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if notification belongs to another user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-id',
        userId: 'other-user-id',
        readAt: null,
      });

      await expect(service.markAsRead('user-id', 'notif-id')).rejects.toThrow(NotFoundException);
    });

    it('should return existing notification if already read', async () => {
      const existingNotif = {
        id: 'notif-id',
        userId: 'user-id',
        type: NotificationType.EVENT_BROADCAST,
        title: 'Title',
        body: 'Body',
        eventId: null,
        data: null,
        readAt: new Date(),
        createdAt: new Date(),
      };

      mockPrisma.notification.findUnique.mockResolvedValue(existingNotif);

      const result = await service.markAsRead('user-id', 'notif-id');

      expect(result.readAt).toBeTruthy();
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('should mark notification as read', async () => {
      const unreadNotif = {
        id: 'notif-id',
        userId: 'user-id',
        type: NotificationType.EVENT_BROADCAST,
        title: 'Title',
        body: 'Body',
        eventId: null,
        data: null,
        readAt: null,
        createdAt: new Date(),
      };

      const updatedNotif = { ...unreadNotif, readAt: new Date() };

      mockPrisma.notification.findUnique.mockResolvedValue(unreadNotif);
      mockPrisma.notification.update.mockResolvedValue(updatedNotif);

      const result = await service.markAsRead('user-id', 'notif-id');

      expect(result.readAt).toBeTruthy();
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-id' },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('listForUser', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-id',
          type: NotificationType.EVENT_BROADCAST,
          title: 'Title 1',
          body: 'Body 1',
          eventId: null,
          data: null,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([1, 1, mockNotifications]);

      const result = await service.listForUser('user-id', { page: 1, pageSize: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      expect(result.totalCount).toBe(1);
    });

    it('should filter unread only when specified', async () => {
      mockPrisma.$transaction.mockResolvedValue([0, 0, []]);

      await service.listForUser('user-id', { unreadOnly: true });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
