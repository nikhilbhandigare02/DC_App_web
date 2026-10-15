/**
 * The facilities saved on the server for the current empanelment, shown on the
 * Facilities list and used to pre-fill the update flow. Built from the single
 * `GetProviderConfigurationDetails` call: the weekly timing and the Additional answers
 * are the same on every item, the rest comes from the facility's own row.
 * Call `loadFacilityConfigs()` to (re)load, e.g. when the list opens.
 */

import { useSyncExternalStore } from 'react';
import { getFacilitiesMaster } from '../../api/ddlApi';
import { apiPostEncryptedSession } from '../../lib/apiClient';
import type { TimeOfDayValue } from '../../types/facility';
import { resolveEmpanelmentMastId } from './utils';

export const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Day = (typeof ALL_DAYS)[number];

export interface FacilityConfigItem {
  /** `FacilityDetailsId` — the saved row's id. */
  id: number;
  name: string;
  /** "Medical" / "Non-Medical" (from the facility master), or "Facility" when unknown. */
  category: string;
  sourceType: 'Inhouse' | 'Outsource';
  visitType: 'Centre' | 'Home';
  /** Default timing, used for every working day without its own entry in [dayTimings]. */
  timing: string;
  workingDays: Day[];
  /** Day -> timing, for days that differ from [timing]. */
  dayTimings: Partial<Record<Day, string>>;
  homeVisit: boolean;
  parking: boolean;
  multispeciality: boolean;
  location?: string;
  contactNo?: string;
  /** The facility's own hours (`HH:mm`), as saved — distinct from the weekly [timing]. */
  facilityTimeFrom: string;
  facilityTimeTo: string;
  /** Facility type id (what `SaveFacilityDetails` takes as `FacilityName`). */
  typeId?: number;
  sourceName: string;
  sourceAddress: string;
  /** The technician travel text. */
  technicianTravel: string;
  /** Outsource details; empty for an Inhouse facility. */
  outsourceDetailId?: number;
  contactPerson: string;
  distanceKm: string;
  pincode: string;
  stateId?: number;
  districtId?: number;
  cityId?: number;
  latitude: string;
  longitude: string;
  photoName?: string;
  videoName?: string;
  /** Full URLs of the saved DC photo / video, to view them. */
  photoUrl?: string;
  videoUrl?: string;
  /** The facility's latest approval status — 29 "DC Requested", 32 "facility Details Update Request", 33 "Remove facility Request" — empty when none. */
  statusId?: number;
  status: string;
  /** Latest approval status of the weekly timing and of the Additional answers (shared by every facility), empty when none. */
  timingStatus: string;
  additionalStatus: string;
  /** Whether the DC Timing / the Additional answers have been saved for the empanelment (rows exist). */
  timingSaved: boolean;
  additionalSaved: boolean;
}

interface StoreState {
  items: FacilityConfigItem[];
  loading: boolean;
  error: string | null;
}

let state: StoreState = { items: [], loading: false, error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFacilityConfigs(): FacilityConfigItem[] {
  return useSyncExternalStore(subscribe, () => state).items;
}

export function useFacilityConfigsStatus(): { loading: boolean; error: string | null } {
  const { loading, error } = useSyncExternalStore(subscribe, () => state);
  return { loading, error };
}

export function getFacilityConfigs(): FacilityConfigItem[] {
  return state.items;
}

export function getFacilityConfig(id: number): FacilityConfigItem | undefined {
  return state.items.find((i) => i.id === id);
}

export function removeFacilityConfig(id: number) {
  setState({ items: state.items.filter((i) => i.id !== id) });
}

/** Where the facility photos / videos are served from (the API stores a path relative to it). */
const PROVIDER_DOC_BASE_URL = 'http://103.118.17.144:8077/ProviderDoc/';

function providerDocUrl(path: unknown): string | undefined {
  const text = (path == null ? '' : String(path)).trim().replace(/\\/g, '/');
  if (!text || text === 'null') return undefined;
  // Already a full URL (some rows store one) — don't prefix the base again.
  if (/^https?:\/\//i.test(text)) return text;
  // Encode each segment so names with '#', '%' or non-ASCII characters still resolve.
  const encoded = text
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `${PROVIDER_DOC_BASE_URL}${encoded}`;
}

type Row = Record<string, unknown>;

const str = (v: unknown): string => {
  const text = v == null ? '' : String(v).trim();
  return text === 'null' ? '' : text;
};
const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n : undefined;
};

/** The `[key]` row list of a `GetProviderConfigurationDetails` response. */
function rowsOf(response: unknown, key: string): Row[] {
  const obj = response && typeof response === 'object' ? (response as Row) : {};
  const list = obj[key] ?? obj[key.charAt(0).toLowerCase() + key.slice(1)];
  return Array.isArray(list) ? list.filter((r): r is Row => !!r && typeof r === 'object') : [];
}

/** "09:00" / "09:00:00" -> time. */
function parseTime(v: unknown): TimeOfDayValue | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(str(v));
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

let inFlight: Promise<void> | null = null;

/**
 * Loads everything saved for the current empanelment into the store. A call made
 * while a load is already running waits for that load instead of returning early,
 * so callers can read the store as soon as the promise resolves.
 */
export function loadFacilityConfigs(): Promise<void> {
  if (!inFlight) {
    inFlight = fetchFacilityConfigs().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function fetchFacilityConfigs(): Promise<void> {
  setState({ loading: true, error: null });
  try {
    // Facility type id + Medical/Non-Medical category, by facility name.
    const idByName = new Map<string, number>();
    const categoryByName = new Map<string, string>();
    try {
      for (const category of await getFacilitiesMaster()) {
        for (const item of category.items) {
          idByName.set(item.name, item.id);
          categoryByName.set(item.name, category.name);
        }
      }
    } catch {
      // The list still works without them; only the category label is lost.
    }

    const empanelmentMastId = resolveEmpanelmentMastId();
    // One call returns the timing, Additional and facility rows together.
    const response = await apiPostEncryptedSession<unknown>('api/Empanelment/GetProviderConfigurationDetails', {
      EmpanelmentMastId: empanelmentMastId,
    });
    const timingRows = rowsOf(response, 'ProviderTimingDetailsData');
    const homeVisitRows = rowsOf(response, 'ProviderHomeVisitDetailsData');
    const facilityRows = rowsOf(response, 'ProviderFacilityDetailsData');

    // Weekly timing: working days (WorkingType "Yes") with "start – end".
    const byAbbr = new Map<Day, string>();
    for (const row of timingRows) {
      const abbr = weekDayAbbr(str(row.DayName));
      const start = parseTime(row.WorkingStartTime);
      const end = parseTime(row.WorkingEndTime);
      if (!abbr || str(row.WorkingType).toLowerCase() !== 'yes' || !start || !end) continue;
      byAbbr.set(abbr, `${formatClock(start)} – ${formatClock(end)}`);
    }
    const workingDays = ALL_DAYS.filter((d) => byAbbr.has(d));
    const counts = new Map<string, number>();
    for (const text of byAbbr.values()) counts.set(text, (counts.get(text) ?? 0) + 1);
    const timing = counts.size === 0 ? '' : [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const dayTimings: Partial<Record<Day, string>> = {};
    for (const [day, text] of byAbbr) if (text !== timing) dayTimings[day] = text;

    // Additional: one row per "done by" choice, the rest repeats.
    const yes = (v: unknown) => str(v).toLowerCase() === 'yes';
    // Latest approval status of the timing / Additional answers (any row).
    const firstStatus = (rows: Row[]) => rows.map((r) => str(r.Status)).find(Boolean) ?? '';
    const timingStatus = firstStatus(timingRows);
    const additionalStatus = firstStatus(homeVisitRows);
    const first = homeVisitRows[0];

    const items: FacilityConfigItem[] = facilityRows.map((row) => {
      const name = str(row.FacilityName);
      const typeId = (num(row.FacilityTypeId) ?? 0) > 0 ? num(row.FacilityTypeId) : idByName.get(name);
      const source = str(row.SourceType);
      const visit = str(row.VisitType);
      return {
        id: num(row.FacilityDetailsId) ?? 0,
        name,
        category: categoryByName.get(name) ?? 'Facility',
        sourceType: source === 'Outsource' ? 'Outsource' : 'Inhouse',
        visitType: visit === 'Home' ? 'Home' : 'Centre',
        timing,
        workingDays,
        dayTimings,
        homeVisit: !!first && yes(first.IsHomeVisitDc),
        parking: !!first && yes(first.IsParkingAvailable),
        multispeciality: !!first && yes(first.IsMultispecialityDc),
        location: str(row.FullAddress) || str(row.SourceAddress),
        contactNo: str(row.ContactNumber),
        typeId,
        facilityTimeFrom: str(row.FacilityTimeFrom),
        facilityTimeTo: str(row.FacilityTimeTo),
        sourceName: str(row.SourceName),
        sourceAddress: str(row.SourceAddress),
        technicianTravel: first ? str(first.TechnicianCapabilityToTravel) : '',
        outsourceDetailId: num(row.OutsourceDetailId),
        contactPerson: str(row.ContactPerson),
        distanceKm: str(row.DistanceKm),
        pincode: str(row.Pincode),
        stateId: num(row.StateId),
        districtId: num(row.DistrictId),
        cityId: num(row.CityId),
        latitude: str(row.Latitude),
        longitude: str(row.Longitude),
        photoName: str(row.DcPhotoFileName) || undefined,
        videoName: str(row.DcVideoFileName) || undefined,
        photoUrl: providerDocUrl(row.PhotoWebPath),
        videoUrl: providerDocUrl(row.VideoFileWebPath),
        statusId: num(row.StatusId),
        status: str(row.Status),
        timingStatus,
        additionalStatus,
        timingSaved: timingRows.length > 0,
        additionalSaved: homeVisitRows.length > 0,
      };
    });
    setState({ items, loading: false });
  } catch (err) {
    setState({ loading: false, error: err instanceof Error ? err.message : 'Could not load facilities.' });
  }
}


/** "Monday" / "mon" -> "Mon"; undefined when it isn't a weekday name. */
export function weekDayAbbr(day: string): Day | undefined {
  const key = day.trim().toLowerCase();
  if (key.length < 3) return undefined;
  return ALL_DAYS.find((d) => key.startsWith(d.toLowerCase()));
}

/** The timing on [day], or null when the facility doesn't work that day. */
export function timingFor(item: FacilityConfigItem, day: Day): string | null {
  return item.workingDays.includes(day) ? (item.dayTimings[day] ?? item.timing) : null;
}

/** `{9, 0}` -> "09:00 AM". */
export function formatClock(time: TimeOfDayValue): string {
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return `${String(hour12).padStart(2, '0')}:${String(time.minute).padStart(2, '0')} ${time.hour < 12 ? 'AM' : 'PM'}`;
}

/** "08:00 AM – 06:00 PM" -> [start, end]; null when it can't be read. */
export function parseClockRange(text: string): [TimeOfDayValue, TimeOfDayValue] | null {
  const matches = [...text.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)];
  if (matches.length < 2) return null;
  const read = (m: RegExpMatchArray): TimeOfDayValue => {
    let hour = Number(m[1]) % 12;
    if (m[3].toUpperCase() === 'PM') hour += 12;
    return { hour, minute: Number(m[2]) };
  };
  return [read(matches[0]), read(matches[1])];
}
