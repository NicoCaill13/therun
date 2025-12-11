// src/routes/routes.module.ts
import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { PrismaService } from '@/infrastructure/db/prisma.service';

@Module({
  controllers: [RoutesController],
  providers: [RoutesService, PrismaService],
  exports: [RoutesService],
})
export class RoutesModule { }
