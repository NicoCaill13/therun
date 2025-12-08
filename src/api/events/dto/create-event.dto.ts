import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'Run du jeudi soir – Run & Drink' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Sortie EF tranquille, tous niveaux bienvenus',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: '2025-12-15T19:00:00.000Z',
    description: 'Date/heure de départ en ISO (UTC ou TZ gérée côté front)',
  })
  @IsDateString()
  startDateTime: string;

  @ApiProperty({ example: 'Parc Borély', required: false })
  @IsString()
  @IsOptional()
  locationName?: string;

  @ApiProperty({ example: 'Avenue du Prado, 13008 Marseille', required: false })
  @IsString()
  @IsOptional()
  locationAddress?: string;

  @ApiProperty({ example: 43.262, required: false })
  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @ApiProperty({ example: 5.376, required: false })
  @IsNumber()
  @IsOptional()
  locationLng?: number;
}
