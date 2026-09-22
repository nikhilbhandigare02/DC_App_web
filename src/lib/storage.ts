/**
 * Wraps `localStorage`, mirroring `lib/utils/storage_service.dart`'s
 * `StorageService` (which uses `flutter_secure_storage`). Web has no
 * equivalent secure-storage API, so `localStorage` is the closest analog —
 * do not store anything here that wouldn't already be acceptable in the
 * Dart app's cache (it stores the raw login/profile payload, not a
 * password or a long-lived secret beyond the bearer token itself).
 */

const KEY_TOKEN = 'auth_token';
const KEY_USER_DATA = 'user_data';
const KEY_IS_LOGIN = 'is_login';
const KEY_LANGUAGE = 'language_code';

/**
 * Freeform JSON blob cached across the login/profile calls — same shape as
 * the Dart app's cached payload. Known fields are listed for convenience;
 * the backend's key casing is inconsistent, so callers should still read
 * through `pick()` (see `src/utils/pick.ts`) rather than assuming a single
 * casing is present.
 */
export interface StoredUserData {
  userId?: string | number;
  username?: string;
  providerName?: string;
  providerNumber?: string;
  isFirstLogin?: boolean;
  [key: string]: unknown;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(KEY_TOKEN);
}

export function setToken(token: string): void {
  localStorage.setItem(KEY_TOKEN, token);
}

export function clearToken(): void {
  localStorage.removeItem(KEY_TOKEN);
}

/**
 * Persists the "already logged in" flag: `true` once a login succeeds,
 * `false` on logout. Checked at app start so a returning user skips the
 * login screen and goes straight to home.
 */
export function setIsLogin(isLogin: boolean): void {
  localStorage.setItem(KEY_IS_LOGIN, isLogin ? '1' : '0');
}

export function getIsLogin(): boolean {
  return localStorage.getItem(KEY_IS_LOGIN) === '1';
}

export function getUserData(): StoredUserData | null {
  return safeParse<StoredUserData>(localStorage.getItem(KEY_USER_DATA));
}

export function setUserData(userData: StoredUserData): void {
  localStorage.setItem(KEY_USER_DATA, JSON.stringify(userData));
}

export function clearUserData(): void {
  localStorage.removeItem(KEY_USER_DATA);
}

export function getLanguageCode(): string | null {
  return localStorage.getItem(KEY_LANGUAGE);
}

export function setLanguageCode(code: string): void {
  localStorage.setItem(KEY_LANGUAGE, code);
}

/** Clears everything this module owns — call on sign-out. */
export function clearAll(): void {
  clearToken();
  clearUserData();
  localStorage.removeItem(KEY_IS_LOGIN);
  localStorage.removeItem(KEY_LANGUAGE);
}
