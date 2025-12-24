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

@Controller('me')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MeController {
  constructor(private readonly meService: MeService) { }

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
}
