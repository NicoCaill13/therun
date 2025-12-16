import { Controller, Get, Param } from '@nestjs/common';
import { JoinService } from './join.service';
import { JoinEventSummaryDto } from './dto/join-event-summary.dto';

@Controller('join')
export class JoinController {
  constructor(private readonly joinService: JoinService) { }

  @Get(':eventCode')
  resolve(@Param('eventCode') eventCode: string): Promise<JoinEventSummaryDto> {
    return this.joinService.resolveEventByCode(eventCode);
  }
}
