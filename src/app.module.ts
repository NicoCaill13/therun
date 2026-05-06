import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './api/health/health.module';
import { SpontaneousRunModule } from './api/spontaneous-run/spontaneous-run.module';
import { UserModule } from './api/user/user.module';
import { PrismaModule } from './infrastructure/db/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    HealthModule,
    UserModule,
    SpontaneousRunModule,
  ],
  controllers: [],
})
export class AppModule { }
