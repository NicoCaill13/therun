import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserPlan } from '@prisma/client';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);
  });

  describe('updateUserPlan', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserPlan('non-existent-id', { plan: UserPlan.PREMIUM })).rejects.toThrow(NotFoundException);
    });

    it('should upgrade user from FREE to PREMIUM', async () => {
      const userId = 'user-id';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        plan: UserPlan.FREE,
      };

      const updatedUser = {
        ...existingUser,
        plan: UserPlan.PREMIUM,
        planSince: new Date(),
        planUntil: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserPlan(userId, { plan: UserPlan.PREMIUM });

      expect(result.previousPlan).toBe(UserPlan.FREE);
      expect(result.newPlan).toBe(UserPlan.PREMIUM);
      expect(result.changedAt).toBeTruthy();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          plan: UserPlan.PREMIUM,
          planSince: expect.any(Date),
        }),
        select: expect.any(Object),
      });
    });

    it('should downgrade user from PREMIUM to FREE', async () => {
      const userId = 'user-id';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        plan: UserPlan.PREMIUM,
      };

      const updatedUser = {
        ...existingUser,
        plan: UserPlan.FREE,
        planSince: new Date(),
        planUntil: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserPlan(userId, { plan: UserPlan.FREE });

      expect(result.previousPlan).toBe(UserPlan.PREMIUM);
      expect(result.newPlan).toBe(UserPlan.FREE);
    });

    it('should set custom planSince and planUntil dates', async () => {
      const userId = 'user-id';
      const customPlanSince = '2025-01-01T00:00:00.000Z';
      const customPlanUntil = '2025-12-31T23:59:59.000Z';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        plan: UserPlan.FREE,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        plan: UserPlan.PREMIUM,
        planSince: new Date(customPlanSince),
        planUntil: new Date(customPlanUntil),
      });

      const result = await service.updateUserPlan(userId, {
        plan: UserPlan.PREMIUM,
        planSince: customPlanSince,
        planUntil: customPlanUntil,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          planSince: new Date(customPlanSince),
          planUntil: new Date(customPlanUntil),
        }),
        select: expect.any(Object),
      });
      expect(result.planSince).toEqual(new Date(customPlanSince));
      expect(result.planUntil).toEqual(new Date(customPlanUntil));
    });

    it('should be idempotent (same plan twice)', async () => {
      const userId = 'user-id';
      const existingUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        plan: UserPlan.PREMIUM,
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        planSince: new Date(),
        planUntil: null,
      });

      const result = await service.updateUserPlan(userId, { plan: UserPlan.PREMIUM });

      expect(result.previousPlan).toBe(UserPlan.PREMIUM);
      expect(result.newPlan).toBe(UserPlan.PREMIUM);
    });
  });
});
