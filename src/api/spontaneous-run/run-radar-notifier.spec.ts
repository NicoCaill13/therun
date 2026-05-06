import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '@/api/location/location.service';
import { PUSH_NOTIFICATION_GATEWAY } from '@/api/push/push-notification-gateway';
import { USER_REPOSITORY } from '@/api/user/repositories/user.repository';
import type { SpontaneousRun } from './domain/spontaneous-run';
import { RunRadarNotifier } from './run-radar-notifier';

describe('RunRadarNotifier', () => {
  const run: SpontaneousRun = {
    id: 'run_1',
    creatorId: 'capo',
    locationName: 'Parc',
    latitude: 45.5,
    longitude: -73.6,
    startTime: new Date(),
    maxParticipants: 15,
    vibe: 'Chill',
    status: 'ACTIVE',
    createdAt: new Date(),
  };

  it('sends push to tokens returned by repository', async () => {
    const location = {
      calculateDynamicRadius: jest.fn().mockReturnValue(5),
    };
    const users = {
      findNearbyWithExpoTokens: jest.fn().mockResolvedValue([
        { userId: 'u2', expoPushToken: 'ExponentPushToken[x]' },
      ]),
    };
    const push = { sendRunNearby: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunRadarNotifier,
        { provide: LocationService, useValue: location },
        { provide: USER_REPOSITORY, useValue: users },
        { provide: PUSH_NOTIFICATION_GATEWAY, useValue: push },
      ],
    }).compile();

    const notifier = module.get(RunRadarNotifier);
    await notifier.notifyNearbyAfterRunCreated(run);

    expect(location.calculateDynamicRadius).toHaveBeenCalledWith(45.5, -73.6);
    expect(users.findNearbyWithExpoTokens).toHaveBeenCalledWith(
      'capo',
      45.5,
      -73.6,
      5,
    );
    expect(push.sendRunNearby).toHaveBeenCalledWith(
      ['ExponentPushToken[x]'],
      expect.objectContaining({ runId: 'run_1' }),
    );
  });

  it('swallows push errors', async () => {
    const location = {
      calculateDynamicRadius: jest.fn().mockReturnValue(5),
    };
    const users = {
      findNearbyWithExpoTokens: jest.fn().mockResolvedValue([
        { userId: 'u2', expoPushToken: 'ExponentPushToken[x]' },
      ]),
    };
    const push = {
      sendRunNearby: jest.fn().mockRejectedValue(new Error('network')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunRadarNotifier,
        { provide: LocationService, useValue: location },
        { provide: USER_REPOSITORY, useValue: users },
        { provide: PUSH_NOTIFICATION_GATEWAY, useValue: push },
      ],
    }).compile();

    const notifier = module.get(RunRadarNotifier);
    await expect(notifier.notifyNearbyAfterRunCreated(run)).resolves.toBeUndefined();
  });
});
