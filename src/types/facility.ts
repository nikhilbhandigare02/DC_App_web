/**
 * Ported from `lib/models/facility_master_model.dart` and
 * `lib/models/facility_models.dart`.
 */

/** A single facility-type leaf item under a {@link FacilityMasterCategory}. */
export interface FacilityMasterItem {
  id: number;
  name: string;
}

/**
 * A facility-type category ("Medical" / "Non-Medical") from
 * `POST api/DDL/GetFacilitiesMaster`, grouping its `items`.
 */
export interface FacilityMasterCategory {
  id: number;
  name: string;
  items: FacilityMasterItem[];
}

/** `HH:mm` 24-hour time, e.g. `"09:00"`. Mirrors Flutter's `TimeOfDay`. */
export interface TimeOfDayValue {
  hour: number;
  minute: number;
}

/** Working hours for a single day of the week ("DC Timing" tab). */
export interface DayTimingData {
  day: string;
  /** The day's id from `GetDay` — what `SaveTimingDetails` takes as `DayName`. */
  dayId?: number;
  isWorking: boolean;
  startTime: TimeOfDayValue;
  endTime: TimeOfDayValue;
}

/** A facility type offered by the DC ("Facilities" tab). */
export interface FacilityEntryData {
  id: string;
  typeCode: string;
  typeLabel: string;
  sourceType?: string | null;
  visitType?: string | null;
  sourceName: string;
  sourceAddress: string;
  timeFrom: TimeOfDayValue;
  timeTo: TimeOfDayValue;
  /** Only required when `sourceType === 'Outsource'`. */
  contactPerson: string;
  contactNumber: string;
  distanceKm: string;
  fullAddress: string;
  pincode: string;
  latitude: string;
  longitude: string;
  stateId?: number | null;
  stateName?: string | null;
  districtId?: number | null;
  districtName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  dcPhotoFile?: File | null;
  dcVideoFile?: File | null;
  /** Update flow: names of the photo/video already stored (no File to re-send). */
  dcPhotoFileName?: string | null;
  dcVideoFileName?: string | null;
  /** Update flow: where the stored photo/video can be opened (view link). */
  dcPhotoUrl?: string | null;
  /** Latest approval status of a saved facility (status master name, e.g. "DC Requested"); empty for a new one. */
  status?: string | null;
  statusId?: number | null;
  dcVideoUrl?: string | null;
  /** Ids of the rows already saved (0/undefined = new) — sent back so a re-save updates them. */
  facilityDetailsId?: number;
  outsourceDetailId?: number;
}
