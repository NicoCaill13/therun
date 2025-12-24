import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class NotificationDto {
  @IsString()
  id: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  eventId: string | null;

  @IsOptional()
  data: any;

  @IsDateString()
  createdAt: string;

  @IsOptional()
  @IsDateString()
  readAt: string | null;
}
