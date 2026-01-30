/**
 * Formats a Date to ISO string or returns null.
 * Useful for consistent date serialization in DTOs.
 */
export function toIsoString(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

/**
 * Adds minutes to a date and returns a new Date object.
 * Does not mutate the original date.
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Subtracts minutes from a date and returns a new Date object.
 * Does not mutate the original date.
 */
export function subtractMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60_000);
}

/**
 * Returns the start of the ISO week (Monday 00:00:00) for a given date.
 * ISO weeks start on Monday.
 */
export function getStartOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // day: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Diff to Monday: if Sunday (0), go back 6 days; otherwise go back (day - 1)
  const diffToMonday = day === 0 ? 6 : day - 1;

  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);

  return d;
}

/**
 * Returns the end of the ISO week (Sunday 23:59:59.999) for a given date.
 */
export function getEndOfIsoWeek(date: Date): Date {
  const monday = getStartOfIsoWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return sunday;
}

/**
 * Returns the start of the next ISO week (exclusive end for week range queries).
 */
export function getStartOfNextIsoWeek(date: Date): Date {
  const monday = getStartOfIsoWeek(date);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  return nextMonday;
}
