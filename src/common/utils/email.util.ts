/**
 * Normalizes an email address for consistent storage and comparison.
 * - Trims whitespace
 * - Converts to lowercase
 *
 * @param email - Email address to normalize
 * @returns Normalized email address
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) {
    return '';
  }
  return email.trim().toLowerCase();
}

/**
 * Validates that an email string is not empty after normalization.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && normalized.includes('@');
}
