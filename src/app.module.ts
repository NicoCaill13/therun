import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/db/prisma.module';
import { EventsModule } from './api/events/events.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { RoutesModule } from './api/routes/routes.module';
import { EventInvitesModule } from './api/event-invites/event-invites.module';
import { MeModule } from './api/me/me.module';
import { JoinModule } from './api/join/join.module';
import { RemindersModule } from './api/reminders/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventsModule,
    AuthModule,
    RoutesModule,
    EventInvitesModule,
    MeModule,
    JoinModule,
    RemindersModule,
  ],
})
export class AppModule { }
