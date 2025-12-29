import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class PublicOrganiserDto {
  @ApiProperty({ example: 'Nicolas' })
  @IsString()
  firstName!: string;

  @ApiPropertyOptional({ example: 'Cailleux' })
  @IsOptional()
  @IsString()
  lastName?: string | null;
}

export class PublicJoinDto {
  @ApiProperty({ example: '5QZ6HTEP' })
  @IsString()
  eventCode!: string;

  @ApiProperty({ example: 'cmjiqge350003r3y34zcqlb6q' })
  @IsString()
  eventId!: string;
}

export class PublicEventByCodeResponseDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  eventCode!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ example: '2030-01-01T12:05:00.000Z' })
  @IsISO8601()
  startDateTime!: string;

  @ApiProperty({ enum: EventStatus })
  @IsEnum(EventStatus)
  status!: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationAddress?: string | null;

  @ApiProperty({ type: PublicOrganiserDto })
  organiser!: PublicOrganiserDto;

  @ApiProperty({ type: PublicJoinDto })
  join!: PublicJoinDto;
}
