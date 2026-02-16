import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RouteType } from '@/common/enums';

export enum EventRouteMode {
  NEW = 'NEW',
  ATTACH = 'ATTACH',
  COPY = 'COPY',
}

export class CreateEventRouteDto {
  @IsEnum(EventRouteMode)
  mode: EventRouteMode;

  @IsOptional()
  @IsString()
  encodedPolyline?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RouteType)
  type?: RouteType;

  @IsOptional()
  @IsString()
  routeId?: string;
}
