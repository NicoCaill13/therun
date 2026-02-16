import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { RouteMapper } from './route.mapper';

@Module({
  controllers: [RoutesController],
  providers: [RoutesService, RouteMapper],
  exports: [RoutesService, RouteMapper],
})
export class RoutesModule {}
