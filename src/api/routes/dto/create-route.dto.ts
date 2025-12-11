import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RouteType } from '@prisma/client';

export class CreateRouteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  encodedPolyline: string;

  @IsOptional()
  @IsEnum(RouteType)
  type?: RouteType;
}
