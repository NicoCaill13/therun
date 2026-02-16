import { Module } from '@nestjs/common';
import { EventRoutesService } from './event-routes.service';
import { EventRouteMapper } from './event-route.mapper';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [RoutesModule],
  providers: [EventRoutesService, EventRouteMapper],
  exports: [EventRoutesService, EventRouteMapper],
})
export class EventRoutesModule {}
