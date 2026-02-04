import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class PublicGuestJoinResponseDto {
  @ApiProperty()
  @IsString()
  eventId!: string;

  @ApiProperty()
  @IsString()
  participantId!: string;

  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsBoolean()
  isGuest!: boolean;

  /**
   * Short-lived JWT (24h) for guest session.
   * Front can store it as a bearer token for subsequent calls.
   */
  @ApiProperty({
    description: 'JWT access token for the guest user (valid ~24h)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  accessToken!: string;
}
