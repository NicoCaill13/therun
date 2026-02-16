export const UserPlan = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
} as const;

export type UserPlan = (typeof UserPlan)[keyof typeof UserPlan];
