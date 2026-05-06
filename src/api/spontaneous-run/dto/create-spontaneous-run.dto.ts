import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSpontaneousRunDto {
  @ApiProperty({
    description: 'Existing user id (Capo). Must exist.',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @MinLength(1)
  creatorId!: string;

  @ApiProperty({ example: 'Place Morgan', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  locationName!: string;

  @ApiProperty({ example: 45.5017 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -73.5673 })
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ example: '2026-05-08T18:30:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ description: 'Defaults to 15', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxParticipants?: number;

  @ApiProperty({ example: 'Chill', maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  vibe!: string;
}
