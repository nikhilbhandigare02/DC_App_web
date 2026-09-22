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
import type { TimeOfDayValue } from '../../types/facility';

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
