import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMyLocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  expoPushToken?: string;
}
