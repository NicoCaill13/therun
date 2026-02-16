export const RouteType = {
  ROUTE: 'ROUTE',
  TRAIL: 'TRAIL',
  MIXED: 'MIXED',
} as const;

export type RouteType = (typeof RouteType)[keyof typeof RouteType];
