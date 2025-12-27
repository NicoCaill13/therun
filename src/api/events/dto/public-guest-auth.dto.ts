import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class PublicGuestAuthDto {
  @ApiProperty({ example: 'cmjiqge350003r3y34zcqlb6q' })
  @IsString()
  @MinLength(10)
  participantId!: string;

  @ApiProperty({ example: '5QZ6HTEP' })
  @IsString()
  @MinLength(5)
  eventCode!: string;
}
