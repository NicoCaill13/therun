import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@/prisma/client';
import { USER_REPOSITORY } from './repositories/user.repository';
import { UserLocationService } from './user-location.service';

describe('UserLocationService', () => {
  it('delegates to repository', async () => {
    const users = { updateLastKnownLocation: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLocationService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserLocationService);
    await svc.updateMyLocation('u1', {
      latitude: 45.5,
      longitude: -73.6,
      expoPushToken: 'ExponentPushToken[x]',
    });
    expect(users.updateLastKnownLocation).toHaveBeenCalledWith(
      'u1',
      45.5,
      -73.6,
      'ExponentPushToken[x]',
    );
  });

  it('maps missing user to NotFoundException', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('missing', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const users = {
      updateLastKnownLocation: jest.fn().mockRejectedValue(err),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLocationService,
        { provide: USER_REPOSITORY, useValue: users },
      ],
    }).compile();
    const svc = module.get(UserLocationService);
    await expect(
      svc.updateMyLocation('missing', { latitude: 1, longitude: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
