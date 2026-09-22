/** Ported from `lib/repository/ddl_repository.dart`. */

import { apiPostEncryptedSession } from '../lib/apiClient';
import type { DdlOptionModel, DayOptionModel } from '../types/ddl';
import type { FacilityMasterCategory, FacilityMasterItem } from '../types/facility';
import type { MasterLookupItem } from '../types/lookup';

export const GET_YES_NO_ENDPOINT = 'api/DDL/GetYesNo';
export const GET_DAYS_ENDPOINT = 'api/DDL/GetDay';
export const GET_DOCTOR_TYPE_ENDPOINT = 'api/DDL/GetDoctorType';
export const GET_DOCTOR_SPECIALIZATION_ENDPOINT = 'api/DDL/GetDoctorSpecialization';
export const GET_SOURCE_TYPE_ENDPOINT = 'api/DDL/GetSourceType';
export const GET_VISIT_TYPE_ENDPOINT = 'api/DDL/GetVisitType';
export const GET_FACILITIES_MASTER_ENDPOINT = 'api/DDL/GetFacilitiesMaster';
export const GET_STATES_ENDPOINT = 'api/DDL/GetStates';
export const GET_DISTRICT_BY_STATE_ENDPOINT = 'api/DDL/GetDistrictByState';
// Endpoint name is spelled "Citiy" (typo) on the backend — preserved verbatim.
export const GET_CITY_NAME_ENDPOINT = 'api/DDL/GetCitiyName';
export const GET_CITY_BY_PINCODE_ENDPOINT = 'api/DDL/GetCityByPincode';
export const GET_DISTRICT_NAME_ENDPOINT = 'api/DDL/GetDistrictName';
export const GET_STATE_NAME_ENDPOINT = 'api/DDL/GetStateName';

function str(value: unknown): string {
  return value != null && `${value}`.trim() !== '' ? `${value}`.trim() : '';
}

function ddlOptionFromJson(json: Record<string, unknown>): DdlOptionModel {
  const pickFirst = (keys: string[]) => {
    for (const key of keys) {
      const s = str(json[key]);
      if (s) return s;
    }
    return '';
  };
  const label = pickFirst(['Label', 'label', 'Text', 'text', 'Name', 'name', 'DisplayText', 'displayText', 'DisplayName']);
  const value = pickFirst(['Value', 'value', 'Id', 'id', 'Code', 'code', 'Key', 'key']);
  return { label: label || value, value: value || label };
}

/** Unwraps a `{Data:[...]}` (or bare array) envelope into `DdlOptionModel[]`. Exported for report-upload dropdown reuse. */
export function ddlOptionsFromResponse(json: unknown): DdlOptionModel[] {
  let rawList: unknown[];
  if (Array.isArray(json)) {
    rawList = json;
  } else if (json && typeof json === 'object') {
    const d = json as Record<string, unknown>;
    const data = d.Data ?? d.data ?? d.Result ?? d.result;
    rawList = Array.isArray(data) ? data : [];
  } else {
    rawList = [];
  }
  return rawList
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ddlOptionFromJson(entry as Record<string, unknown>))
    .filter((option) => option.label.length > 0);
}

function dayOptionFromJson(json: Record<string, unknown>): DayOptionModel {
  return {
    id: (json.id ?? json.Id) as number | null,
    name: (json.name ?? json.Name) as string | null,
    isSelected: (json.isSelected ?? json.IsSelected) as boolean | null,
  };
}

function facilityMasterItemFromJson(json: Record<string, unknown>): FacilityMasterItem {
  return {
    id: Number(json.Id ?? json.id ?? 0) || 0,
    name: str(json.Name ?? json.name),
  };
}

function facilityMasterCategoryFromJson(json: Record<string, unknown>): FacilityMasterCategory {
  const rawItems = json.data ?? json.Data ?? [];
  const items = (Array.isArray(rawItems) ? rawItems : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => facilityMasterItemFromJson(entry as Record<string, unknown>))
    .filter((item) => item.name.length > 0);

  return {
    id: Number(json.Id ?? json.id ?? 0) || 0,
    name: str(json.Name ?? json.name),
    items,
  };
}

function facilityMasterCategoriesFromResponse(json: unknown): FacilityMasterCategory[] {
  let rawList: unknown[];
  if (Array.isArray(json)) {
    rawList = json;
  } else if (json && typeof json === 'object') {
    const d = json as Record<string, unknown>;
    const data = d.Data ?? d.data ?? d.Result ?? d.result;
    rawList = Array.isArray(data) ? data : [];
  } else {
    rawList = [];
  }
  return rawList
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => facilityMasterCategoryFromJson(entry as Record<string, unknown>))
    .filter((category) => category.name.length > 0);
}

function masterLookupItemFromResponse(response: unknown): MasterLookupItem | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as Record<string, unknown>;
  let data: unknown = r.Data ?? r.data ?? r;
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    data = data[0];
  }
  if (!data || typeof data !== 'object') return null;

  const map = data as Record<string, unknown>;
  const idRaw = map.Id ?? map.id;
  const id = typeof idRaw === 'number' ? idRaw : idRaw != null ? Number(idRaw) : NaN;
  const name = str(map.Name ?? map.name);
  if (Number.isNaN(id) || !name) return null;

  const paramIdRaw = map.Paramid ?? map.ParamId ?? map.paramId ?? map.Param_Id;
  const paramId = typeof paramIdRaw === 'number' ? paramIdRaw : paramIdRaw != null ? Number(paramIdRaw) : undefined;

  return { id, name, paramId: paramId != null && !Number.isNaN(paramId) ? paramId : undefined };
}

/**
 * `POST api/DDL/GetYesNo` with an encrypted session body — same pattern as
 * every other DDL endpoint. (Originally ported as a plain unencrypted GET
 * per the Flutter app's behavior, but the actual backend controller is
 * `[HttpPost("GetYesNo")]` + `[ValidateEncryptedRequest]`, so a GET call
 * gets rejected with 405 Method Not Allowed.)
 */
export async function getYesNo(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_YES_NO_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Yes/No options are not available right now.');
  return options;
}

export async function getDay(): Promise<DayOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_DAYS_ENDPOINT, {});
  const rawList = Array.isArray(response)
    ? response
    : response && typeof response === 'object'
      ? ((response as Record<string, unknown>).data ?? (response as Record<string, unknown>).Data)
      : undefined;
  const days = (Array.isArray(rawList) ? rawList : [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => dayOptionFromJson(entry as Record<string, unknown>));
  if (days.length === 0) throw new Error('Days are not available right now.');
  return days;
}

export async function getDoctorType(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_DOCTOR_TYPE_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Doctor types are not available right now.');
  return options;
}

export async function getDoctorSpecialization(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_DOCTOR_SPECIALIZATION_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Doctor specializations are not available right now.');
  return options;
}

export async function getSourceType(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_SOURCE_TYPE_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Source types are not available right now.');
  return options;
}

export async function getVisitType(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_VISIT_TYPE_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Visit types are not available right now.');
  return options;
}

export async function getFacilitiesMaster(): Promise<FacilityMasterCategory[]> {
  const response = await apiPostEncryptedSession(GET_FACILITIES_MASTER_ENDPOINT, {});
  const categories = facilityMasterCategoriesFromResponse(response);
  if (categories.length === 0) throw new Error('Facility types are not available right now.');
  return categories;
}

// `GetStates` returns the flat state list with no request params, same as
// every other DDL endpoint in this catalogue (no `GetCountries` call feeding
// it — there's no Country field in the "Contact & Location" form).
export async function getStates(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_STATES_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('States are not available right now.');
  return options;
}

/** Districts cascade from the selected State. */
export async function getDistrictByState(stateId: number): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_DISTRICT_BY_STATE_ENDPOINT, { stateId });
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Districts are not available right now.');
  return options;
}

/** Cities cascade from the selected District. Endpoint name preserves the backend's "Citiy" typo. */
export async function getCityName(districtId: number): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_CITY_NAME_ENDPOINT, { districtId });
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Cities are not available right now.');
  return options;
}

/** Resolves a 6-digit pincode to its City — `{Id, Name, Paramid}`, `Paramid` being the city's parent District id. */
export async function getCityByPincode(pincode: string): Promise<MasterLookupItem | null> {
  const response = await apiPostEncryptedSession(GET_CITY_BY_PINCODE_ENDPOINT, { pincode });
  return masterLookupItemFromResponse(response);
}

/** Reverse-looks-up a District by id — `Paramid` is the parent State id. */
export async function getDistrictName(id: number, districtId: number): Promise<MasterLookupItem | null> {
  const response = await apiPostEncryptedSession(GET_DISTRICT_NAME_ENDPOINT, { id, districtId });
  return masterLookupItemFromResponse(response);
}

/** Reverse-looks-up a State by id (`Paramid` unused for a top-level State). */
export async function getStateName(id: number, stateId: number): Promise<MasterLookupItem | null> {
  const response = await apiPostEncryptedSession(GET_STATE_NAME_ENDPOINT, { id, stateId });
  return masterLookupItemFromResponse(response);
}
