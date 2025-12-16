import { Type } from 'class-transformer';
import { IsArray, IsDate, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class MeInvitationItemDto {
  @IsString()
  participantId: string;

  @IsString()
  eventId: string;

  @IsIn(['PARTICIPANT', 'ENCADRANT', 'ORGANISER'])
  role: 'PARTICIPANT' | 'ENCADRANT' | 'ORGANISER';

  @IsIn(['INVITED'])
  status: 'INVITED';

  @IsString()
  eventTitle: string;

  @Type(() => Date)
  @IsDate()
  startDateTime: Date;

  @IsOptional()
  @IsString()
  locationName: string | null;

  @IsString()
  organiserId: string;

  @IsString()
  organiserFirstName: string;

  @IsOptional()
  @IsString()
  organiserLastName: string | null;
}

export class MeInvitationsResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MeInvitationItemDto)
  items: MeInvitationItemDto[];

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
