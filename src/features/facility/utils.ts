/**
 * Small helpers shared across the Facility feature — time formatting, a
 * client-side id generator for locally-created rows, and the
 * `EmpanelmentMastId` resolution used by several save calls (mirrors the
 * fallback logic in `doctorApi.getProviderDoctorDetails`, ported from the
 * Dart bloc's `_resolveEmpanelmentMastId`).
 */

import { flattenProfileEnvelope } from '../../api/profileApi';
import { getUserData } from '../../lib/storage';
import { pick } from '../../utils/pick';
import type { BadgeTone } from '../../components/ui/Badge';
import type { TimeOfDayValue } from '../../types/facility';

/** A request still waiting at "DC Requested" (status 29) cannot be edited or removed until a reviewer acts on it. */
export function isDcRequestedStatus(statusId?: number | null, status?: string | null): boolean {
  return statusId === 29 || status?.trim().toLowerCase() === 'dc requested';
}

/** File types the backend accepts for each facility / doctor upload. */
export const UPLOAD_RULES = {
  doctorCertificate: { accept: '.pdf,.jpg,.jpeg,.png', exts: ['pdf', 'jpg', 'jpeg', 'png'], label: 'PDF, JPG or PNG' },
  facilityPhoto: { accept: '.jpg,.jpeg,.png', exts: ['jpg', 'jpeg', 'png'], label: 'JPG or PNG' },
  facilityVideo: { accept: '.mp4', exts: ['mp4'], label: 'MP4' },
} as const;

/** Returns the file when its extension is accepted; otherwise null (the caller shows the error). */
export function isAcceptedUpload(file: File, exts: readonly string[]): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return exts.includes(ext);
}

/** Remove is hidden while a request is "DC Requested", "Verifier Rejected" or "HOD Rejected". */
export function isRemoveBlockedStatus(statusId?: number | null, status?: string | null): boolean {
  return (
    isDcRequestedStatus(statusId, status) ||
    statusId === 31 ||
    statusId === 33 ||
    (status ?? '').toLowerCase().includes('reject')
  );
}

/** Badge colour for a request status such as "DC Requested", "Verifier Accepted" or "HOD Rejected". */
export function statusTone(status: string, statusId?: number | null): BadgeTone {
  if (statusId === 33 || statusId === 31) return 'error';
  const key = status.toLowerCase();
  if (key.includes('reject')) return 'error';
  if (key.includes('approv') || key.includes('accept') || key.includes('complete')) return 'success';
  if (key.includes('request') || key.includes('pending') || key.includes('process')) return 'warning';
  return 'info';
}

let localIdCounter = 0;

/** Generates a stable-enough client-side id for rows that don't have a server id yet. */
export function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${Date.now()}-${localIdCounter}`;
}

export function resolveEmpanelmentMastId(): number {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const cachedRow = flattenProfileEnvelope(cached);
  const raw = pick<number | string>(cachedRow, 'EmpanelmentMastId', 'empanelmentMastId', 'EmpanelmentMastID') ?? 4;
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(asNumber) ? asNumber : 4;
}

/**
 * The provider id captured at login (the same value the appointment list sends as `DcProviderId`),
 * read from the stored login data. 0 when it is not there.
 */
export function resolveProviderId(): number {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const cachedRow = flattenProfileEnvelope(cached);
  const raw = pick<number | string>(
    cachedRow,
    'ProviderId',
    'providerId',
    'ProviderNumber',
    'providerNumber',
    'DcProviderId',
    'dcProviderId',
    'Dc_Provider_id',
    'dc_Provider_id',
  );
  const asNumber = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(asNumber) ? asNumber : 0;
}

export function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** `TimeOfDayValue` -> `"HH:mm"` for a native `<input type="time">`. */
export function timeToInputValue(time: TimeOfDayValue): string {
  return `${pad2(time.hour)}:${pad2(time.minute)}`;
}

/** `"HH:mm"` (from a native time input) -> `TimeOfDayValue`. */
export function inputValueToTime(value: string): TimeOfDayValue {
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

/** Minutes since midnight, for comparing two `TimeOfDayValue`s. */
export function timeToMinutes(time: TimeOfDayValue): number {
  return time.hour * 60 + time.minute;
}

export function defaultDateInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
