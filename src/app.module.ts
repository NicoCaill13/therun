import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/db/prisma.module';
import { EventsModule } from './api/events/events.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { RoutesModule } from './api/routes/routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    EventsModule,
    AuthModule,
    RoutesModule,
  ],
})
export class AppModule { }
