import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpontaneousRunModule } from './api/spontaneous-run/spontaneous-run.module';
import { PrismaModule } from './infrastructure/db/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    SpontaneousRunModule,
  ],
  controllers: [],
})
export class AppModule { }
