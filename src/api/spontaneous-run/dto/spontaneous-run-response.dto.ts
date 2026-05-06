import { ApiProperty } from '@nestjs/swagger';

export class SpontaneousRunResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  creatorId!: string;

  @ApiProperty()
  locationName!: string;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  @ApiProperty({ description: 'ISO 8601' })
  startTime!: string;

  @ApiProperty()
  maxParticipants!: number;

  @ApiProperty()
  vibe!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ description: 'ISO 8601' })
  createdAt!: string;
}
