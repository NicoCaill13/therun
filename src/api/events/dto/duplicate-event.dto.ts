// src/api/events/dto/duplicate-event.dto.ts
import { EventType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsISO8601, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class DuplicateEventDto {
  @IsISO8601()
  startDateTime!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  locationAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsBoolean()
  copyAllGroups?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  groupIds?: string[];
}
