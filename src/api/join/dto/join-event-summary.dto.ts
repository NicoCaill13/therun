import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinEventSummaryDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @Type(() => Date)
  @IsDate()
  startDateTime: Date;

  @IsOptional()
  @IsString()
  locationName: string | null;

  @IsOptional()
  @IsNumber()
  locationLat: number | null;

  @IsOptional()
  @IsNumber()
  locationLng: number | null;

  @IsString()
  @IsNotEmpty()
  organiserId: string;

  @IsString()
  @IsNotEmpty()
  organiserFirstName: string;

  @IsOptional()
  @IsString()
  organiserLastName: string | null;
}
