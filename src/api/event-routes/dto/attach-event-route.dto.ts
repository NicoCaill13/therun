import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum EventRouteMode {
  NEW = 'NEW',
  ATTACH = 'ATTACH',
  COPY = 'COPY',
}

export class AttachEventRouteDto {
  @IsEnum(EventRouteMode)
  mode!: EventRouteMode;

  @IsOptional()
  @IsString()
  @MinLength(1)
  routeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
