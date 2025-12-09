import { Expose } from 'class-transformer';
import { RoleInEvent, EventParticipantStatus } from '@prisma/client';

export class EventParticipantDto {
  @Expose()
  userId: string | null; // guests = null

  @Expose()
  displayName: string;

  @Expose()
  eventRouteId: string | null;

  @Expose()
  eventGroupId: string | null;

  // on ajoutera plus tard (roleInEvent, etc.)
  @Expose()
  roleInEvent?: RoleInEvent;

  @Expose()
  status!: EventParticipantStatus;
}

export class CurrentUserParticipationResponseDto {
  @Expose()
  userId!: string | null;

  @Expose()
  roleInEvent!: RoleInEvent;

  @Expose()
  status!: EventParticipantStatus;

  @Expose()
  eventRouteId!: string | null;

  @Expose()
  eventGroupId!: string | null;
}
