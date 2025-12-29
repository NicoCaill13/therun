import { ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class MeEventItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, format: 'date-time' })
  startDateTime: Date;

  @ApiProperty({ enum: EventStatus })
  status: EventStatus;

  @ApiProperty({ required: false, nullable: true })
  locationName: string | null;

  @ApiProperty({ required: false, nullable: true })
  locationAddress: string | null;

  @ApiProperty()
  goingCount: number;
}
