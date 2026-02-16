import { IsIn } from 'class-validator';
import { EventParticipantStatus } from '@/common/enums';

export class UpsertMyParticipationDto {
  @IsIn([EventParticipantStatus.GOING, EventParticipantStatus.DECLINED, EventParticipantStatus.MAYBE])
  status: EventParticipantStatus;
}
