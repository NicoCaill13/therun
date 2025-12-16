import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JoinService } from './join.service';
import { JoinEventSummaryDto } from './dto/join-event-summary.dto';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { JoinParticipateResponseDto } from './dto/join-participate-response.dto';

@Controller('join')
export class JoinController {
  constructor(private readonly joinService: JoinService) { }

  @Get(':eventCode')
  resolve(@Param('eventCode') eventCode: string): Promise<JoinEventSummaryDto> {
    return this.joinService.resolveEventByCode(eventCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':eventCode/participate')
  @HttpCode(200)
  participate(@Param('eventCode') eventCode: string, @CurrentUser() user: JwtUser): Promise<JoinParticipateResponseDto> {
    return this.joinService.participate(eventCode, user.userId);
  }
}
