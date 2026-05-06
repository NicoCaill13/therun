export type RunNearbyPushPayload = {
  runId: string;
  title: string;
  body: string;
};

export const PUSH_NOTIFICATION_GATEWAY = Symbol('PUSH_NOTIFICATION_GATEWAY');

export interface PushNotificationGateway {
  sendRunNearby(
    expoPushTokens: string[],
    payload: RunNearbyPushPayload,
  ): Promise<void>;
}
