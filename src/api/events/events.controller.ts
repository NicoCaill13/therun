// src/events/events.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
// @UseGuards(JwtAuthGuard) // à réactiver quand ton guard est prêt
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Créer un événement (MVP-1)' })
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateEventDto) {
    return this.eventsService.createForOrganiser(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':eventId')
  async findOne(
    @CurrentUser() user: JwtUser,
    @Param('eventId') eventId: string,
  ): Promise<EventDetailsResponseDto> {
    return this.eventsService.getEventDetails(eventId, user.userId);
  }
}
