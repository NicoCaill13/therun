import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublicGuestJoinDto {
  @ApiProperty({ example: 'Nicolas' })
  @IsString()
  @MaxLength(50)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Caill' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: 'nico@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
