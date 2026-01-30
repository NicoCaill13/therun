/**
 * User data structure for display name computation.
 * All fields are optional to handle partial user objects.
 */
export interface DisplayNameInput {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  id?: string;
}

/**
 * Builds a user display name following a consistent priority order:
 * 1. displayName (if present)
 * 2. firstName + lastName (combined)
 * 3. firstName only
 * 4. email
 * 5. id
 * 6. fallback default
 *
 * @param user - User object with optional name fields
 * @param fallback - Default value if no name can be derived (default: 'Inconnu')
 * @returns The computed display name
 */
export function buildDisplayName(user: DisplayNameInput | null | undefined, fallback = 'Inconnu'): string {
  if (!user) {
    return fallback;
  }

  // Priority 1: Explicit displayName
  if (user.displayName) {
    return user.displayName;
  }

  // Priority 2-3: firstName + lastName combination
  const parts: string[] = [];

  if (user.firstName) {
    parts.push(user.firstName);
  }

  if (user.lastName) {
    parts.push(user.lastName);
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  // Priority 4: email
  if (user.email) {
    return user.email;
  }

  // Priority 5: id
  if (user.id) {
    return user.id;
  }

  // Priority 6: fallback
  return fallback;
}

/**
 * Builds a display name specifically for guests.
 * Uses 'Invité' as the default fallback.
 */
export function buildGuestDisplayName(user: DisplayNameInput | null | undefined): string {
  return buildDisplayName(user, 'Invité');
}
