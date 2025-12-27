import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { PublicEventByCodeResponseDto } from './dto/public-event-by-code-response.dto';
import { PublicGuestJoinResponseDto } from './dto/public-guest-join-response.dto';
import { PublicGuestJoinDto } from './dto/public-guest-join.dto';

@ApiTags('Public')
@Controller('public/events')
export class EventsPublicController {
  constructor(private readonly eventsService: EventsService) { }

  @Get('by-code/:eventCode')
  @ApiOperation({ summary: 'Récupérer un event public par eventCode (QR)' })
  @ApiParam({ name: 'eventCode', required: true, example: '5QZ6HTEP' })
  @ApiOkResponse({ type: PublicEventByCodeResponseDto })
  @ApiBadRequestResponse({
    description: 'eventCode invalide',
    schema: { example: { statusCode: 400, error: 'Bad Request', message: 'eventCode is required' } },
  })
  @ApiNotFoundResponse({
    description: 'Event introuvable / non disponible',
    schema: { example: { statusCode: 404, error: 'Not Found', message: 'Event not found' } },
  })
  getByCode(@Param('eventCode') eventCode: string): Promise<PublicEventByCodeResponseDto> {
    return this.eventsService.getPublicByCode(eventCode);
  }

  @Post(':eventId/guest-join')
  @ApiOperation({ summary: 'Guest join (public) — crée/attache une participation GOING' })
  @ApiParam({ name: 'eventId', required: true })
  @ApiCreatedResponse({ type: PublicGuestJoinResponseDto })
  @ApiNotFoundResponse({
    description: 'Event not found',
    schema: { example: { statusCode: 404, error: 'Not Found', message: 'Event not found' } },
  })
  @ApiBadRequestResponse({
    description: 'Event not joinable / validation DTO',
    schema: { example: { statusCode: 400, error: 'Bad Request', message: 'Event not joinable' } },
  })
  guestJoin(@Param('eventId') eventId: string, @Body() dto: PublicGuestJoinDto): Promise<PublicGuestJoinResponseDto> {
    return this.eventsService.guestJoinPublic(eventId, dto);
  }
}
