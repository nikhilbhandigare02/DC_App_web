/** Ported from `lib/repository/doctor_repository.dart`. */

import { apiPostEncryptedSession } from '../lib/apiClient';
import { getUserData } from '../lib/storage';
import { pick, pickString } from '../utils/pick';
import { flattenProfileEnvelope } from './profileApi';
import type { ProviderDoctorDetail, ProviderDoctorDetailsResponseModel } from '../types/doctor';

export const GET_PROVIDER_DOCTOR_DETAILS_ENDPOINT = 'api/Empanelment/GetProviderDoctorDetails';
export const SAVE_DOCTOR_DETAILS_ENDPOINT = 'api/Empanelment/SaveDoctorDetails';
export const SAVE_DOCTOR_UPDATE_REQUEST_ENDPOINT = 'api/Empanelment/SaveDoctorUpdateRequest';
export const DELETE_DOCTOR_REQUEST_ENDPOINT = 'api/Empanelment/DeleteDoctorRequest';

function numOrUndefined(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normalizes one raw row into {@link ProviderDoctorDetail}. A plain `as
 * ProviderDoctorDetail` cast on the raw JSON silently leaves every field
 * `undefined` whenever the backend's casing doesn't match exactly (confirmed
 * mixed PascalCase/camelCase against a real login response).
 */
function toProviderDoctorDetail(row: Record<string, unknown>): ProviderDoctorDetail {
  return {
    empanelmentMastId: numOrUndefined(pick(row, 'empanelmentMastId', 'EmpanelmentMastId')),
    providerNo: numOrUndefined(pick(row, 'providerNo', 'ProviderNo')),
    providerName: pickString(row, 'providerName', 'ProviderName') || undefined,
    doctorId: numOrUndefined(pick(row, 'doctorId', 'DoctorId')),
    doctorName: pickString(row, 'doctorName', 'DoctorName') || undefined,
    doctorType: pickString(row, 'doctorType', 'DoctorType') || undefined,
    contactNo: pickString(row, 'contactNo', 'ContactNo') || undefined,
    qualification: pickString(row, 'qualification', 'Qualification') || undefined,
    medicalRegistrationNo: pickString(row, 'medicalRegistrationNo', 'MedicalRegistrationNo') || undefined,
    speciality: pickString(row, 'speciality', 'Speciality') || undefined,
    fromDate: pickString(row, 'fromDate', 'FromDate') || undefined,
    toDate: pickString(row, 'toDate', 'ToDate') || undefined,
    status: pickString(row, 'status', 'Status') || undefined,
    newFileName: pickString(row, 'newFileName', 'NewFileName') || undefined,
    // The procedure returns the base URL even when there is no file, so the path only counts with a file name.
    newFilePath: pickString(row, 'newFileName', 'NewFileName') ? pickString(row, 'newFilePath', 'NewFilePath') || undefined : undefined,
  };
}

function toProviderDoctorDetailsResponseModel(json: Record<string, unknown>): ProviderDoctorDetailsResponseModel {
  // The Dart model's field is `data` — not a model-name-prefixed key. Keep the old
  // guessed names as extra fallbacks in case a specific deployment differs.
  const rawList = pick<unknown[]>(
    json,
    'data',
    'Data',
    'providerDoctorDetailsData',
    'ProviderDoctorDetailsData',
    'Result',
    'result',
  );
  return {
    success: pick<boolean>(json, 'success', 'Success'),
    statusCode: pick<number>(json, 'statusCode', 'StatusCode'),
    message: pick<string>(json, 'message', 'Message'),
    data: Array.isArray(rawList)
      ? rawList.filter((e) => e && typeof e === 'object').map((e) => toProviderDoctorDetail(e as Record<string, unknown>))
      : undefined,
  };
}

/**
 * Loads the doctors empanelled at the current provider's diagnostic centre.
 *
 * `UserProfileModel` doesn't reliably carry an `EmpanelmentMastId` field, so
 * this lookup resolves to `undefined` far more often than not — fall back to
 * `4` rather than sending a null/missing id, which the API rejects (mirrors
 * the Dart repository's fallback exactly).
 */
export async function getProviderDoctorDetails(): Promise<ProviderDoctorDetail[]> {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const cachedRow = flattenProfileEnvelope(cached);
  const empanelmentMastId =
    pick(cachedRow, 'EmpanelmentMastId', 'empanelmentMastId', 'EmpanelmentMastID') ?? 4;

  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_PROVIDER_DOCTOR_DETAILS_ENDPOINT, {
    EmpanelmentMastId: empanelmentMastId,
  });

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load facility doctors. Please try again.');
  }

  const envelope = toProviderDoctorDetailsResponseModel(response);
  if (envelope.success === false) {
    throw new Error(envelope.message || 'Could not load facility doctors. Please try again.');
  }
  return envelope.data ?? [];
}

/** `data` is arbitrary — the endpoint accepts whatever shape the "Add/Edit Doctor" form builds. */
export async function saveDoctor(data: Record<string, unknown>): Promise<unknown> {
  return apiPostEncryptedSession(SAVE_DOCTOR_DETAILS_ENDPOINT, data);
}

/** One doctor, as `SaveDoctorUpdateRequest` takes it (a single object, not a `details` array). */
export interface DoctorUpdateRequest {
  empanelmentMastId: number;
  /** The provider id stored at login. */
  providerId: number;
  /** 0 adds a new doctor; an existing doctor's id (`tbl_provider_doctor_details.doctor_id`) edits it. */
  doctorMastId: number;
  doctorTypeId: number;
  doctorName: string;
  qualification: string;
  medicalRegistrationNo: string;
  contactNo: string;
  speciality: number;
  fromDate?: string | null;
  toDate?: string | null;
}

/**
 * Insert or update one doctor. `doctorMastId` 0 adds a new doctor directly; an existing id sends the
 * edit for approval instead of applying it (the backend saves the request, its old/new history and a
 * pending approval row).
 */
export async function saveDoctorUpdateRequest(data: DoctorUpdateRequest): Promise<unknown> {
  return apiPostEncryptedSession(SAVE_DOCTOR_UPDATE_REQUEST_ENDPOINT, data);
}

/**
 * Requests the removal of a doctor. The doctor is not deactivated: the backend only records a row in the
 * approval table with status 114 (removal requested). `doctorMastId` is the id the doctor list returns.
 */
export async function deleteDoctorRequest(params: { empanelmentMastId: number; doctorMastId: number }): Promise<unknown> {
  return apiPostEncryptedSession(DELETE_DOCTOR_REQUEST_ENDPOINT, params);
}
