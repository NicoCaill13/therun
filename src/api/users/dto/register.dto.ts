import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'nico@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Nicolas' })
  @IsString()
  @MaxLength(50)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Cailleux' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @ApiProperty({ example: true, description: 'Consentement global (MVP)' })
  @IsBoolean()
  acceptTerms!: boolean;
}
