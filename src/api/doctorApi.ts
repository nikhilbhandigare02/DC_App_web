/** Ported from `lib/repository/doctor_repository.dart`. */

import { apiPostEncryptedSession } from '../lib/apiClient';
import { getUserData } from '../lib/storage';
import { pick, pickString } from '../utils/pick';
import { flattenProfileEnvelope } from './profileApi';
import type { ProviderDoctorDetail, ProviderDoctorDetailsResponseModel } from '../types/doctor';

export const GET_PROVIDER_DOCTOR_DETAILS_ENDPOINT = 'api/Empanelment/GetProviderDoctorDetails';
export const SAVE_DOCTOR_DETAILS_ENDPOINT = 'api/Empanelment/SaveDoctorDetails';

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
