import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { MeService } from './me.service';
import { MeInvitationsQueryDto } from './dto/me-invitations-query.dto';
import { MeInvitationsResponseDto } from './dto/me-invitations-response.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MeController {
  constructor(private readonly meService: MeService) { }

  @Get('invitations')
  listInvitations(@CurrentUser() user: JwtUser, @Query() query: MeInvitationsQueryDto): Promise<MeInvitationsResponseDto> {
    return this.meService.listInvitations(user.userId, query);
  }
}
