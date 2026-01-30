import { Controller, Get, HttpCode, Param, Patch, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { JwtUser } from '@/types/jwt';
import { MeService } from './me.service';
import { MeInvitationsQueryDto } from './dto/me-invitations-query.dto';
import { MeInvitationsResponseDto } from './dto/me-invitations-response.dto';
import { ListMyNotificationsQueryDto } from '../notifications/dto/list-my-notifications-query.dto';
import { MyNotificationsResponseDto } from '../notifications/dto/my-notifications-response.dto';
import { NotificationDto } from '../notifications/dto/notification.dto';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { MeEventsListResponseDto } from './dto/me-events-list.response.dto';
import { MeEventsQueryDto } from './dto/me-events-query.dto';
import { MeProfileWithBenefitsResponseDto } from './dto/me-profile.dto';

@ApiTags('Me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer mon profil avec les avantages du plan' })
  @ApiOkResponse({ type: MeProfileWithBenefitsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getProfile(@CurrentUser() user: JwtUser): Promise<MeProfileWithBenefitsResponseDto> {
    return this.meService.getProfile(user);
  }

  @Get('invitations')
  listInvitations(@CurrentUser() user: JwtUser, @Query() query: MeInvitationsQueryDto): Promise<MeInvitationsResponseDto> {
    return this.meService.listInvitations(user.userId, query);
  }

  @Get('notifications')
  listMyNotifications(@CurrentUser() user: JwtUser, @Query() query: ListMyNotificationsQueryDto): Promise<MyNotificationsResponseDto> {
    return this.meService.listMyNotifications(user, query);
  }

  @Patch('notifications/:notificationId/read')
  @HttpCode(200)
  markNotificationAsRead(@CurrentUser() user: JwtUser, @Param('notificationId') notificationId: string): Promise<NotificationDto> {
    return this.meService.markNotificationAsRead(user, notificationId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Lister mes événements (future|past|cancelled)' })
  @ApiOkResponse({ type: MeEventsListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  listMyEvents(@CurrentUser() user: JwtUser, @Query() query: MeEventsQueryDto): Promise<MeEventsListResponseDto> {
    return this.meService.listMyEvents(user, query);
  }
}
