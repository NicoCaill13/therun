import { IsIn } from 'class-validator';
import { EventParticipantStatus } from '@prisma/client';

export class UpsertMyParticipationDto {
  @IsIn([EventParticipantStatus.GOING, EventParticipantStatus.DECLINED, EventParticipantStatus.MAYBE])
  status: EventParticipantStatus;
}
