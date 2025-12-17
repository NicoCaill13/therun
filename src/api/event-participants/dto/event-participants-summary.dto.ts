import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ParticipantsByRouteDto {
  @IsString()
  eventRouteId: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  goingCount: number;
}

export class ParticipantsByGroupDto {
  @IsString()
  eventGroupId: string;

  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  goingCount: number;
}

export class EventParticipantsSummaryDto {
  @IsInt()
  @Min(0)
  goingCount: number;

  @IsInt()
  @Min(0)
  invitedCount: number;

  @IsInt()
  @Min(0)
  maybeCount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantsByRouteDto)
  byRoute: ParticipantsByRouteDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantsByGroupDto)
  byGroup: ParticipantsByGroupDto[];
}
