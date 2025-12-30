import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class ListRoutesQueryDto {
  @IsOptional()
  @IsIn(['me'], { message: 'createdBy must be one of the following values: me' })
  createdBy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  radiusMeters?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  distanceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  distanceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
