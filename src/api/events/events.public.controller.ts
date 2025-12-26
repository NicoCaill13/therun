import { Controller, Get, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { PublicEventByCodeResponseDto } from './dto/public-event-by-code-response.dto';

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
}
