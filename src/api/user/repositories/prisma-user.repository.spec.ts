import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository', () => {
  it('findNearbyWithExpoTokens filters by haversine inside bounding preselect', async () => {
    const centerLat = 45.5;
    const centerLng = -73.6;
    const radiusKm = 5;

    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'near',
            lastKnownLatitude: 45.501,
            lastKnownLongitude: -73.601,
            expoPushToken: 'ExponentPushToken[near]',
          },
          {
            id: 'far',
            lastKnownLatitude: 46.5,
            lastKnownLongitude: -73.6,
            expoPushToken: 'ExponentPushToken[far]',
          },
        ]),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaUserRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    const repo = module.get(PrismaUserRepository);
    const res = await repo.findNearbyWithExpoTokens(
      'capo',
      centerLat,
      centerLng,
      radiusKm,
    );

    expect(res.map((r) => r.userId)).toEqual(['near']);
  });
});
