import { ApiProperty } from '@nestjs/swagger';
import { MeEventItemDto } from './me-event-item.dto';

export class MeEventsListResponseDto {
  @ApiProperty({ type: [MeEventItemDto] })
  items: MeEventItemDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  total: number;
}
