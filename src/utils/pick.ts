/**
 * Reads a value out of an object trying several possible key spellings, in
 * order, and returns the first one that is present and non-null.
 *
 * The DC portal backend mixes PascalCase and camelCase inconsistently across
 * (and sometimes within) endpoints, so every response read needs to try a
 * handful of casings — this mirrors the `_pick`/`pick` helpers scattered
 * across the Flutter app's `lib/models/*.dart` files.
 *
 * @example
 * pick(obj, 'userId', 'UserId', 'UserID')
 */
export function pick<T = unknown>(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): T | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return undefined;
}

/** Same as {@link pick}, but returns a trimmed non-empty string or `''`. */
export function pickString(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!obj) return '';
  for (const key of keys) {
    const raw = obj[key];
    if (raw !== undefined && raw !== null && `${raw}`.trim() !== '') {
      return `${raw}`.trim();
    }
  }
  return '';
}

/** Same as {@link pick}, but coerces to `boolean` using common truthy spellings. */
export function pickBool(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): boolean {
  if (!obj) return false;
  for (const key of keys) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'boolean') return value;
    const s = `${value}`.toLowerCase().trim();
    if (s === '1' || s === 'true' || s === 'yes' || s === 'y') return true;
    if (s === '0' || s === 'false' || s === 'no' || s === 'n') return false;
  }
  return false;
}

/** Same as {@link pick}, but coerces to `number` (or `undefined` if unparsable). */
export function pickNumber(
  obj: Record<string, unknown> | null | undefined,
  ...keys: string[]
): number | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}
