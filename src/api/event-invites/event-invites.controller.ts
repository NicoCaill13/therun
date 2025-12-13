import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { EventInvitesService } from './event-invites.service';
import { InviteSearchQueryDto } from './dto/invite-search-query.dto';
import { InviteSearchResponseDto } from './dto/invite-search-response.dto';

@Controller('events/:eventId/invite')
@UseGuards(JwtAuthGuard)
export class EventInvitesController {
  constructor(private readonly eventInvitesService: EventInvitesService) { }

  @Get('search')
  search(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtUser,
    @Query() query: InviteSearchQueryDto,
  ): Promise<InviteSearchResponseDto> {
    return this.eventInvitesService.searchUsersToInvite(eventId, user.userId, query);
  }
}
