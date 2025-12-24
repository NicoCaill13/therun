import { IsInt, Min } from 'class-validator';

export class BroadcastEventResponseDto {
  @IsInt()
  @Min(0)
  sentCount!: number;
}
