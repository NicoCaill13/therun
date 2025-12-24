// src/events/events.controller.ts
import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
import { UpsertMyParticipationDto } from '../event-participants/dto/upsert-my-participation.dto';
import { UpdateMySelectionDto } from '../event-participants/dto/update-my-selection.dto';
import { ListEventParticipantsQueryDto } from '../event-participants/dto/list-event-participants-query.dto';
import { EventParticipantsListResponseDto } from '../event-participants/dto/event-participants-list.dto';
import { EventParticipantsSummaryDto } from '../event-participants/dto/event-participants-summary.dto';
import { BroadcastEventDto } from './dto/broadcast-event.dto';
import { BroadcastEventResponseDto } from './dto/broadcast-event-response.dto';

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
  @Post(':eventId/broadcast')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Broadcast un message aux participants de l’événement',
    description:
      'Envoie une notification `EVENT_BROADCAST` à tous les participants de l’event (hors `DECLINED`). ' +
      'N’envoie rien aux participants sans `userId` (guests).',
  })
  @ApiOkResponse({
    description: 'Broadcast envoyé',
    type: BroadcastEventResponseDto,
    schema: {
      example: { sentCount: 4 },
    },
  })
  @ApiBadRequestResponse({
    description: 'Payload invalide (DTO class-validator)',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: ['body should not be empty'],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Non authentifié (token manquant/invalide)',
    schema: {
      example: { statusCode: 401, message: 'Unauthorized' },
    },
  })
  @ApiForbiddenResponse({
    description: 'Accès refusé (seul l’organisateur peut broadcaster)',
    schema: {
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only organiser can broadcast to participants',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Event introuvable',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Event not found',
      },
    },
  })
  broadcast(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: BroadcastEventDto,
  ): Promise<BroadcastEventResponseDto> {
    return this.eventParticipantsService.broadcastToParticipants(eventId, user.userId, dto);
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

  @UseGuards(JwtAuthGuard)
  @Post(':eventId/participants/me')
  @HttpCode(200)
  upsertMyParticipation(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpsertMyParticipationDto,
  ): Promise<EventParticipantDto> {
    return this.eventParticipantsService.upsertMyParticipation(eventId, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':eventId/participants/me')
  @HttpCode(200)
  updateMySelection(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateMySelectionDto,
  ): Promise<EventParticipantDto> {
    return this.eventParticipantsService.updateMySelection(eventId, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':eventId/participants')
  listParticipants(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Query() query: ListEventParticipantsQueryDto,
  ): Promise<EventParticipantsListResponseDto> {
    return this.eventParticipantsService.listEventParticipantsForOrganiser(eventId, user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':eventId/participants/summary')
  getParticipantsSummary(@Param('eventId') eventId: string, @CurrentUser() user: JwtUser): Promise<EventParticipantsSummaryDto> {
    return this.eventParticipantsService.getParticipantsSummary(eventId, user.userId);
  }
}
