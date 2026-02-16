import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventsService } from './events.service';
import { EventParticipantsService } from '../event-participants/event-participants.service';
import { EventParticipantDto } from '../event-participants/dto/event-participant.dto';
import { UpdateParticipantRoleDto } from '../event-participants/dto/update-participant-role.dto';
import { InviteParticipantDto } from '../event-participants/dto/invite-participant.dto';
import { InviteParticipantResponseDto } from '../event-participants/dto/invite-participant-response.dto';
import { RespondInvitationResponseDto } from '../event-participants/dto/respond-invitation-response.dto';
import { RespondInvitationDto } from '../event-participants/dto/respond-invitation.dto';
import { UpsertMyParticipationDto } from '../event-participants/dto/upsert-my-participation.dto';
import { UpdateMySelectionDto } from '../event-participants/dto/update-my-selection.dto';
import { ListEventParticipantsQueryDto } from '../event-participants/dto/list-event-participants-query.dto';
import { EventParticipantsListResponseDto } from '../event-participants/dto/event-participants-list.dto';
import { EventParticipantsSummaryDto } from '../event-participants/dto/event-participants-summary.dto';
import { BroadcastEventDto } from './dto/broadcast-event.dto';
import { BroadcastEventResponseDto } from './dto/broadcast-event-response.dto';

@ApiTags('Event Participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId/participants')
export class EventParticipantsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventParticipantsService: EventParticipantsService,
  ) {}

  @Post('invite')
  async invite(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: InviteParticipantDto,
  ): Promise<InviteParticipantResponseDto> {
    const result = await this.eventParticipantsService.inviteExistingUser(eventId, user.userId, dto);
    return result.data;
  }

  @Patch(':userId/role')
  async updateParticipantRole(
    @Param('eventId') eventId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateParticipantRoleDto,
    @CurrentUser() user: JwtUser,
  ): Promise<EventParticipantDto> {
    return this.eventsService.updateParticipantRole(eventId, userId, user.userId, dto);
  }

  @Post(':participantId/respond')
  @HttpCode(200)
  respond(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: RespondInvitationDto,
  ): Promise<RespondInvitationResponseDto> {
    return this.eventParticipantsService.respondToInvitation(eventId, participantId, user.userId, dto);
  }

  @Post('me')
  @HttpCode(200)
  upsertMyParticipation(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpsertMyParticipationDto,
  ): Promise<EventParticipantDto> {
    return this.eventParticipantsService.upsertMyParticipation(eventId, user.userId, dto);
  }

  @Patch('me')
  @HttpCode(200)
  updateMySelection(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateMySelectionDto,
  ): Promise<EventParticipantDto> {
    return this.eventParticipantsService.updateMySelection(eventId, user.userId, dto);
  }

  @Get()
  listParticipants(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Query() query: ListEventParticipantsQueryDto,
  ): Promise<EventParticipantsListResponseDto> {
    return this.eventParticipantsService.listEventParticipantsForOrganiser(eventId, user.userId, query);
  }

  @Get('summary')
  getParticipantsSummary(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<EventParticipantsSummaryDto> {
    return this.eventParticipantsService.getParticipantsSummary(eventId, user.userId);
  }
}

/**
 * Broadcast is logically an event-level action targeting participants.
 * Kept in this controller for grouping.
 */
@ApiTags('Event Participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events/:eventId')
export class EventBroadcastController {
  constructor(private readonly eventParticipantsService: EventParticipantsService) {}

  @Post('broadcast')
  @HttpCode(200)
  broadcast(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: BroadcastEventDto,
  ): Promise<BroadcastEventResponseDto> {
    return this.eventParticipantsService.broadcastToParticipants(eventId, user.userId, dto);
  }
}
