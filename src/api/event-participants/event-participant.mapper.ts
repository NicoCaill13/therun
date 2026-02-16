import { Injectable } from '@nestjs/common';
import { RoleInEvent, EventParticipantStatus } from '@/common/enums';
import { EventParticipantDto } from './dto/event-participant.dto';
import { buildDisplayName } from '@/common/utils/display-name.util';

export interface EventParticipantRaw {
  userId: string | null;
  role: RoleInEvent;
  status: EventParticipantStatus;
  eventRouteId: string | null;
  eventGroupId: string | null;
  user?: { firstName: string; lastName: string | null } | null;
}

@Injectable()
export class EventParticipantMapper {
  toDto(p: EventParticipantRaw): EventParticipantDto {
    return {
      userId: p.userId,
      displayName: buildDisplayName(p.user, 'Participant'),
      roleInEvent: p.role,
      status: p.status,
      eventRouteId: p.eventRouteId ?? null,
      eventGroupId: p.eventGroupId ?? null,
    };
  }
}
