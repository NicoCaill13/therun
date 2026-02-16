export const RoleInEvent = {
  ORGANISER: 'ORGANISER',
  ENCADRANT: 'ENCADRANT',
  PARTICIPANT: 'PARTICIPANT',
} as const;

export type RoleInEvent = (typeof RoleInEvent)[keyof typeof RoleInEvent];
