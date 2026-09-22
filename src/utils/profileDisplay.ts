import type { UserProfileModel } from '../types/profile';

/** Best-effort display name: full name, then DC name, then a generic fallback. */
export function effectiveDisplayName(profile: UserProfileModel | null | undefined): string {
  if (profile?.fullName) return profile.fullName;
  if (profile?.dcName) return profile.dcName;
  return 'DC Account';
}

/** `DC-<providerNumber>` badge text, or `null` when no provider number is known yet. */
export function providerCode(profile: UserProfileModel | null | undefined): string | null {
  if (profile?.providerNumber) return `DC-${profile.providerNumber}`;
  return null;
}

/** Two-letter (or single-word) initials for the avatar fallback, mirroring the Dart `_initials` helper. */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return 'DC';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Renders `-` for an empty/whitespace-only value, matching the Dart `_orDash` helper. */
export function orDash(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : '-';
}
