// src/events/events.controller.ts
import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';
import { EventParticipantDto } from '../event-participants/dto/event-participant.dto';
import { UpdateParticipantRoleDto } from '../event-participants/dto/update-participant-role.dto';

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
  async findOne(@CurrentUser() user: JwtUser, @Param('eventId') eventId: string): Promise<EventDetailsResponseDto> {
    return this.eventsService.getEventDetails(eventId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':eventId/participants/:userId/role')
  async updateParticipantRole(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateParticipantRoleDto,
    @CurrentUser() user: JwtUser,
  ): Promise<EventParticipantDto> {
    return this.eventsService.updateParticipantRole(eventId, userId, user.userId, dto);
  }
}
