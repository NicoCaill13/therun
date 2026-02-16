import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventRoutesService } from '../event-routes/event-routes.service';
import { EventRouteDto } from '../event-routes/dto/event-route.dto';
import { CreateEventRouteDto } from '../event-routes/dto/create-event-route.dto';

@ApiTags('Event Routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/routes')
export class EventRoutesController {
  constructor(private readonly eventRoutesService: EventRoutesService) {}

  @Get()
  async listRoutes(@Param('eventId') eventId: string): Promise<EventRouteDto[]> {
    return this.eventRoutesService.listByEvent(eventId);
  }

  @Post()
  async addRoute(
    @Param('eventId') eventId: string,
    @Body() dto: CreateEventRouteDto,
    @CurrentUser() user: JwtUser,
  ): Promise<EventRouteDto> {
    return this.eventRoutesService.addRouteToEvent(eventId, user, dto);
  }
}
