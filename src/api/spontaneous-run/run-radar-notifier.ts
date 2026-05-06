import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SpontaneousRun } from './domain/spontaneous-run';
import { LocationService } from '@/api/location/location.service';
import {
  PUSH_NOTIFICATION_GATEWAY,
  type PushNotificationGateway,
} from '@/api/push/push-notification-gateway';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@/api/user/repositories/user.repository';

@Injectable()
export class RunRadarNotifier {
  private readonly logger = new Logger(RunRadarNotifier.name);

  constructor(
    private readonly locationService: LocationService,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
    @Inject(PUSH_NOTIFICATION_GATEWAY)
    private readonly push: PushNotificationGateway,
  ) {}

  /**
   * Does not throw: errors are logged so run creation never fails on push/radar.
   */
  async notifyNearbyAfterRunCreated(run: SpontaneousRun): Promise<void> {
    try {
      const radiusKm = this.locationService.calculateDynamicRadius(
        run.latitude,
        run.longitude,
      );
      const targets = await this.users.findNearbyWithExpoTokens(
        run.creatorId,
        run.latitude,
        run.longitude,
        radiusKm,
      );
      if (targets.length === 0) {
        this.logger.debug(
          `RunRadarNotifier: no eligible recipients for run ${run.id} (radius ${radiusKm} km)`,
        );
        return;
      }
      const tokens = targets.map((t) => t.expoPushToken);
      await this.push.sendRunNearby(tokens, {
        runId: run.id,
        title: 'Run nearby',
        body: `${run.locationName} — open the app to join.`,
      });
    } catch (err: unknown) {
      this.logger.error(
        `RunRadarNotifier failed for run ${run.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
