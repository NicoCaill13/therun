// src/api/routes/dto/route.dto.ts
import { RouteType } from '@prisma/client';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RouteDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  encodedPolyline: string;

  @IsInt()
  @Min(1)
  distanceMeters: number;

  @IsNumber()
  centerLat: number;

  @IsNumber()
  centerLng: number;

  @IsNumber()
  @Min(0)
  radiusMeters: number;

  @IsOptional()
  @IsEnum(RouteType)
  type: RouteType | null;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
