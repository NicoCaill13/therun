import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { SpontaneousRunModule } from './modules/spontaneous-run/spontaneous-run.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, SpontaneousRunModule],
  controllers: [AppController],
})
export class AppModule { }
