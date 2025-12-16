// src/events/events.controller.ts
import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';
import { EventParticipantDto } from '../event-participants/dto/event-participant.dto';
import { UpdateParticipantRoleDto } from '../event-participants/dto/update-participant-role.dto';
import { EventRoutesService } from '../event-routes/event-routes.service';
import { EventRouteDto } from '../event-routes/dto/event-route.dto';
import { CreateEventRouteDto } from '../event-routes/dto/create-event-route.dto';
import { InviteParticipantDto } from '../event-participants/dto/invite-participant.dto';
import { InviteParticipantResponseDto } from '../event-participants/dto/invite-participant-response.dto';
import { EventParticipantsService } from '../event-participants/event-participants.service';
import { RespondInvitationResponseDto } from '../event-participants/dto/respond-invitation-response.dto';
import { RespondInvitationDto } from '../event-participants/dto/respond-invitation.dto';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventRoutesService: EventRoutesService,
    private readonly eventParticipantsService: EventParticipantsService,
  ) { }

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
  @Post(':eventId/participants/invite')
  async invite(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: InviteParticipantDto,
  ): Promise<InviteParticipantResponseDto> {
    const result = await this.eventParticipantsService.inviteExistingUser(eventId, user.userId, dto);
    return result.data;
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

  @UseGuards(JwtAuthGuard)
  @Post(':eventId/participants/:participantId/respond')
  @HttpCode(200)
  respond(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: RespondInvitationDto,
  ): Promise<RespondInvitationResponseDto> {
    return this.eventParticipantsService.respondToInvitation(eventId, participantId, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':eventId/complete')
  async completeEvent(@Param('eventId') eventId: string, @CurrentUser() user: JwtUser) {
    const currentUserId = user.userId;
    return this.eventsService.completeEvent(eventId, currentUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':eventId/routes')
  async listRoutes(@Param('eventId') eventId: string): Promise<EventRouteDto[]> {
    return this.eventRoutesService.listByEvent(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':eventId/routes')
  async addRoute(
    @Param('eventId') eventId: string,
    @Body() dto: CreateEventRouteDto,
    @CurrentUser() user: JwtUser,
  ): Promise<EventRouteDto> {
    return this.eventRoutesService.addRouteToEvent(eventId, user, dto);
  }
}
