/** Ported from `lib/repository/appointment_repository.dart`. */

import { apiPostEncryptedSession } from '../lib/apiClient';
import { getUserData } from '../lib/storage';
import { pick, pickString } from '../utils/pick';
import { flattenProfileEnvelope } from './profileApi';
import type { AppointmentDetail, AppointmentModel } from '../types/appointment';

export const GET_APPOINTMENT_DETAILS_BY_PROVIDER_ENDPOINT = 'api/Appointment/GetAppointmentDetailsByProvider';
export const GET_APPOINTMENT_DETAILS_BY_ID_ENDPOINT = 'api/Appointment/GetAppointmentDetailsById';

function numOrUndefined(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normalizes one raw row into {@link AppointmentDetail}. The backend mixes
 * PascalCase and camelCase across endpoints (confirmed against a real login
 * response), so every field needs both spellings tried — a plain `as
 * AppointmentDetail` cast on the raw JSON silently leaves every field
 * `undefined` whenever the casing doesn't match exactly.
 */
function toAppointmentDetail(row: Record<string, unknown>): AppointmentDetail {
  return {
    dcProviderId: numOrUndefined(pick(row, 'dcProviderId', 'DcProviderId')),
    providerNumber: pickString(row, 'providerNumber', 'ProviderNumber') || undefined,
    providerName: pickString(row, 'providerName', 'ProviderName') || undefined,
    testIds: pickString(row, 'testIds', 'TestIds') || undefined,
    testNames: pickString(row, 'testNames', 'TestNames') || undefined,
    appointmentDate: pickString(row, 'appointmentDate', 'AppointmentDate') || undefined,
    mobileNumber: pickString(row, 'mobileNumber', 'MobileNumber', 'MobileNo', 'mobileNo') || undefined,
    appointmentSlot: pickString(row, 'appointmentSlot', 'AppointmentSlot') || undefined,
    visitType: pickString(row, 'visitType', 'VisitType') || undefined,
    appointmentStatus: numOrUndefined(pick(row, 'appointmentStatus', 'AppointmentStatus')),
    appointmentStatusName: pickString(row, 'appointmentStatusName', 'AppointmentStatusName') || undefined,
    appointmentSubStatus: numOrUndefined(pick(row, 'appointmentSubStatus', 'AppointmentSubStatus')),
    appointmentSubStatusName: pickString(row, 'appointmentSubStatusName', 'AppointmentSubStatusName') || undefined,
    appointmentBookingId: numOrUndefined(pick(row, 'appointmentBookingId', 'AppointmentBookingId')),
    caseRegistrationMastId: numOrUndefined(pick(row, 'caseRegistrationMastId', 'CaseRegistrationMastId')),
    proposalNo: pickString(row, 'proposalNo', 'ProposalNo') || undefined,
    applicantName: pickString(row, 'applicantName', 'ApplicantName') || undefined,
    insuranceCompanyId: numOrUndefined(pick(row, 'insuranceCompanyId', 'InsuranceCompanyId')),
    insertedDate: pickString(row, 'insertedDate', 'InsertedDate') || undefined,
    insuranceCompanyName: pickString(row, 'insuranceCompanyName', 'InsuranceCompanyName') || undefined,
    age: numOrUndefined(pick(row, 'age', 'Age')),
    dateOfBirth: pickString(row, 'dateOfBirth', 'DateOfBirth') || undefined,
    genderId: numOrUndefined(pick(row, 'genderId', 'GenderId')),
    genderName: pickString(row, 'genderName', 'GenderName') || undefined,
  };
}

function toAppointmentModel(json: Record<string, unknown>): AppointmentModel {
  // The Dart model's field is `data` — not a model-name-prefixed key. Keep the old
  // guessed names as extra fallbacks in case a specific deployment differs.
  const rawList = pick<unknown[]>(
    json,
    'data',
    'Data',
    'appointmentDetailsData',
    'AppointmentDetailsData',
    'Result',
    'result',
  );
  return {
    success: pick<boolean>(json, 'success', 'Success'),
    statusCode: pick<number>(json, 'statusCode', 'StatusCode'),
    message: pick<string>(json, 'message', 'Message'),
    data: Array.isArray(rawList)
      ? rawList.filter((e) => e && typeof e === 'object').map((e) => toAppointmentDetail(e as Record<string, unknown>))
      : undefined,
  };
}

export async function getAppointmentDetailsByProvider(): Promise<AppointmentDetail[]> {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const cachedRow = flattenProfileEnvelope(cached);
  // The provider number captured at login doubles as the DcProviderId this endpoint expects.
  const dcProviderId = pick(cachedRow, 'ProviderNumber', 'providerNumber', 'DcProviderId', 'dcProviderId');

  const response = await apiPostEncryptedSession<Record<string, unknown>>(
    GET_APPOINTMENT_DETAILS_BY_PROVIDER_ENDPOINT,
    { DcProviderId: dcProviderId },
  );

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load appointments. Please try again.');
  }

  const envelope = toAppointmentModel(response);
  if (envelope.success === false) {
    throw new Error(envelope.message || 'Could not load appointments. Please try again.');
  }
  return envelope.data ?? [];
}

export async function getAppointmentDetailsById(caseId?: number, appointmentId?: number): Promise<AppointmentDetail[]> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_APPOINTMENT_DETAILS_BY_ID_ENDPOINT, {
    CaseId: caseId,
    AppointmentId: appointmentId,
  });

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load appointment details. Please try again.');
  }

  const envelope = toAppointmentModel(response);
  if (envelope.success === false) {
    throw new Error(envelope.message || 'Could not load appointment details. Please try again.');
  }
  return envelope.data ?? [];
}
