import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { NotificationDto } from './notification.dto';

export class MyNotificationsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationDto)
  items: NotificationDto[];

  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  pageSize: number;

  @IsInt()
  @Min(0)
  totalCount: number;

  @IsInt()
  @Min(0)
  totalPages: number;

  @IsInt()
  @Min(0)
  unreadCount: number;
}
