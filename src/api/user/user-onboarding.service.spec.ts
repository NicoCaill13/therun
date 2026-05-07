import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@/prisma/client';
import { USER_REPOSITORY } from './repositories/user.repository';
import { UserOnboardingService } from './user-onboarding.service';

describe('UserOnboardingService', () => {
  it('getMyOnboarding returns flags', async () => {
    const users = {
      findOnboardingById: jest.fn().mockResolvedValue({
        hasCompletedOnboarding: true,
        consentDataBrokering: false,
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserOnboardingService);
    const out = await svc.getMyOnboarding('u1');
    expect(out.hasCompletedOnboarding).toBe(true);
    expect(out.consentDataBrokering).toBe(false);
    expect(users.findOnboardingById).toHaveBeenCalledWith('u1');
  });

  it('getMyOnboarding maps missing user to NotFoundException', async () => {
    const users = { findOnboardingById: jest.fn().mockResolvedValue(null) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserOnboardingService);
    await expect(svc.getMyOnboarding('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('patchMyOnboarding rejects empty body', async () => {
    const users = { patchOnboarding: jest.fn(), findOnboardingById: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserOnboardingService);
    await expect(svc.patchMyOnboarding('u1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(users.patchOnboarding).not.toHaveBeenCalled();
  });

  it('patchMyOnboarding applies patch and returns fresh row', async () => {
    const users = {
      patchOnboarding: jest.fn().mockResolvedValue(undefined),
      findOnboardingById: jest.fn().mockResolvedValue({
        hasCompletedOnboarding: true,
        consentDataBrokering: true,
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserOnboardingService);
    const out = await svc.patchMyOnboarding('u1', {
      hasCompletedOnboarding: true,
    });
    expect(users.patchOnboarding).toHaveBeenCalledWith('u1', {
      hasCompletedOnboarding: true,
    });
    expect(out.consentDataBrokering).toBe(true);
  });

  it('patchMyOnboarding maps missing user to NotFoundException', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const users = {
      patchOnboarding: jest.fn().mockRejectedValue(err),
      findOnboardingById: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserOnboardingService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserOnboardingService);
    await expect(
      svc.patchMyOnboarding('missing', { consentDataBrokering: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
