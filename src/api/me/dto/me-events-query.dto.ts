import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MeEventsQueryDto {
  @IsIn(['future', 'past', 'cancelled'], { message: 'scope must be future, past or cancelled' })
  scope!: 'future' | 'past' | 'cancelled';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
