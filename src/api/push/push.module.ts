import { Module } from '@nestjs/common';
import { ExpoHttpPushNotificationGateway } from './expo-http-push-notification.gateway';
import { PUSH_NOTIFICATION_GATEWAY } from './push-notification-gateway';

@Module({
  providers: [
    {
      provide: PUSH_NOTIFICATION_GATEWAY,
      useClass: ExpoHttpPushNotificationGateway,
    },
  ],
  exports: [PUSH_NOTIFICATION_GATEWAY],
})
export class PushModule {}
