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

export class UpdateSpontaneousRunDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  locationName?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxParticipants?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  vibe?: string;
}
