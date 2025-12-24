import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class BroadcastEventResponseDto {
  @ApiProperty({ example: 4, minimum: 0 })
  @IsInt()
  @Min(0)
  sentCount!: number;
}
