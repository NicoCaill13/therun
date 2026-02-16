export const EventStatus = {
  PLANNED: 'PLANNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
