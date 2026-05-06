import { Injectable, Logger } from '@nestjs/common';
import type {
  PushNotificationGateway,
  RunNearbyPushPayload,
} from './push-notification-gateway';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class ExpoHttpPushNotificationGateway implements PushNotificationGateway {
  private readonly logger = new Logger(ExpoHttpPushNotificationGateway.name);

  async sendRunNearby(
    expoPushTokens: string[],
    payload: RunNearbyPushPayload,
  ): Promise<void> {
    const unique = [...new Set(expoPushTokens.filter((t) => t.length > 0))];
    if (unique.length === 0) {
      return;
    }

    const messages = unique.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: { runId: payload.runId },
      sound: 'default' as const,
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(
        `Expo push HTTP ${res.status}: ${text.slice(0, 500)}`,
      );
      return;
    }

    const json = (await res.json().catch(() => null)) as {
      data?: Array<{ status?: string; message?: string }>;
    } | null;
    const errors = json?.data?.filter((d) => d?.status === 'error') ?? [];
    if (errors.length > 0) {
      this.logger.warn(
        `Expo push reported ${errors.length} error(s): ${JSON.stringify(errors).slice(0, 500)}`,
      );
    }
  }
}
