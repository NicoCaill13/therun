import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@/common/enums';
import { IsEnum } from 'class-validator';

export class UpdateEventStatusDto {
  @ApiProperty({ enum: EventStatus, example: EventStatus.COMPLETED })
  @IsEnum(EventStatus, { message: 'status must be a valid EventStatus' })
  status!: EventStatus;
}
