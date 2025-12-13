import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { RouteType } from '@prisma/client';

export class RouteSuggestionItemDto {
  @IsString()
  routeId: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  distanceMeters: number;

  @IsOptional()
  type: RouteType | null;

  @IsNumber()
  centerLat: number;

  @IsNumber()
  centerLng: number;

  @IsNumber()
  @Min(0)
  radiusMeters: number;

  @IsString()
  encodedPolyline: string;

  @IsNumber()
  @Min(0)
  distanceFromStartMeters: number;
}

export class SuggestRoutesResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteSuggestionItemDto)
  items: RouteSuggestionItemDto[];
}
