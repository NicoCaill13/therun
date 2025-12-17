import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListEventParticipantsQueryDto {
  @IsOptional()
  @IsIn(['INVITED', 'GOING', 'MAYBE'])
  status?: 'INVITED' | 'GOING' | 'MAYBE';

  @IsOptional()
  @IsString()
  eventRouteId?: string;

  @IsOptional()
  @IsString()
  eventGroupId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}
