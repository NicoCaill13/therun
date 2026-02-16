import { Controller, Get, Post, Body, Patch, Param, UseGuards, HttpCode } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventCompletionService } from './event-completion.service';
import { EventDuplicationService } from './event-duplication.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { DuplicateEventDto } from './dto/duplicate-event.dto';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventCompletionService: EventCompletionService,
    private readonly eventDuplicationService: EventDuplicationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an event (eventCode auto-generated)' })
  @ApiCreatedResponse({ description: 'Event created (eventCode auto-generated, unique)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Bad Request (validation / eventCode generation failure)' })
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateEventDto) {
    return this.eventsService.createForOrganiser(user.userId, dto);
  }

  @Get(':eventId')
  async findOne(
    @CurrentUser() user: JwtUser,
    @Param('eventId') eventId: string,
  ): Promise<EventDetailsResponseDto> {
    return this.eventsService.getEventDetails(eventId, user.userId);
  }

  @Patch(':eventId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update an event',
    description:
      'If the organiser modifies a critical field (time/location/cancellation), ' +
      'the backend automatically creates notifications for participants (GOING + INVITED).',
  })
  @ApiOkResponse({ description: 'Event updated (and notifications potentially generated)' })
  @ApiBadRequestResponse({ description: 'Invalid payload (class-validator)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Only organiser can update this event' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  async updateEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(eventId, user.userId, dto);
  }

  @Patch(':eventId/complete')
  @ApiOperation({ summary: 'Mark an event as COMPLETED' })
  @ApiParam({ name: 'eventId', type: String })
  @ApiOkResponse({ type: UpdateEventStatusDto, description: 'Event marked COMPLETED (or already COMPLETED)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Event not found' })
  @ApiForbiddenResponse({ description: 'Only organiser can complete this event' })
  @ApiBadRequestResponse({ description: 'Invalid state transition (e.g. event CANCELLED)' })
  async completeEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
  ): Promise<EventDetailsResponseDto> {
    return this.eventCompletionService.completeEvent(eventId, user.userId);
  }

  @Post(':eventId/duplicate')
  @ApiOperation({ summary: 'Duplicate a COMPLETED event (routes/groups structures, without participants)' })
  @ApiResponse({ status: 201, type: EventDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'Bad Request (event not COMPLETED / invalid payload)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (not organiser)' })
  @ApiNotFoundResponse({ description: 'Not Found (event)' })
  async duplicateEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: DuplicateEventDto,
  ): Promise<EventDetailsResponseDto> {
    return this.eventDuplicationService.duplicateEvent(eventId, user.userId, dto);
  }
}
