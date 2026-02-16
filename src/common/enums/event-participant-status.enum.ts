export const EventParticipantStatus = {
  INVITED: 'INVITED',
  GOING: 'GOING',
  MAYBE: 'MAYBE',
  DECLINED: 'DECLINED',
} as const;

export type EventParticipantStatus = (typeof EventParticipantStatus)[keyof typeof EventParticipantStatus];
