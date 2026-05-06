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
  @IsString()
  @MinLength(1)
  creatorId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  locationName!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsDateString()
  startTime!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxParticipants?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  vibe!: string;
}
