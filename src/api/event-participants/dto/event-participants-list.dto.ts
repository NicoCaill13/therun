import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class EventParticipantsListItemDto {
  @IsString()
  participantId: string;

  @IsOptional()
  @IsString()
  userId: string | null;

  @IsString()
  displayName: string;

  @IsIn(['ORGANISER', 'ENCADRANT', 'PARTICIPANT'])
  roleInEvent: 'ORGANISER' | 'ENCADRANT' | 'PARTICIPANT';

  @IsIn(['INVITED', 'GOING', 'MAYBE', 'DECLINED'])
  status: 'INVITED' | 'GOING' | 'MAYBE' | 'DECLINED';

  @IsOptional()
  eventRoute: { id: string; name: string } | null;

  @IsOptional()
  eventGroup: { id: string; label: string } | null;
}

export class EventParticipantsListResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventParticipantsListItemDto)
  items: EventParticipantsListItemDto[];

  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  pageSize: number;

  @IsInt()
  @Min(0)
  totalCount: number;

  @IsInt()
  @Min(0)
  totalPages: number;
}
