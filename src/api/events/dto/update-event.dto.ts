import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional({ example: '2030-01-01T19:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDateTime?: string;

  @ApiPropertyOptional({ example: 'Parc Borély' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationName?: string;

  @ApiPropertyOptional({ example: 'Avenue du Prado, Marseille' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationAddress?: string;

  @ApiPropertyOptional({ example: 43.2727 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLat?: number;

  @ApiPropertyOptional({ example: 5.3811 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  locationLng?: number;

  @ApiPropertyOptional({ enum: EventStatus, example: EventStatus.CANCELLED })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
