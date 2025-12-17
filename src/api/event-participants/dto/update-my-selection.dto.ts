import { IsOptional, IsString } from 'class-validator';

export class UpdateMySelectionDto {
  @IsOptional()
  @IsString()
  eventRouteId?: string | null;

  @IsOptional()
  @IsString()
  eventGroupId?: string | null;
}
