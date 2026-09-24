/**
 * Ported from `lib/repository/report_upload_dropdown_repository.dart` and
 * `lib/repository/report_upload_repository.dart`.
 */

import { apiPostEncryptedSession, apiPostMultipart } from '../lib/apiClient';
import { getUserData } from '../lib/storage';
import { pick, pickString } from '../utils/pick';
import { ddlOptionsFromResponse } from './ddlApi';
import { flattenProfileEnvelope } from './profileApi';
import type { DdlOptionModel } from '../types/ddl';
import type { ReportUploadDocument, ReportUploadListItem, ReportUploadListResponseModel } from '../types/report';

function numOrUndefined(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function boolOrUndefined(value: unknown): boolean | undefined {
  if (value == null) return undefined;
  if (typeof value === 'boolean') return value;
  const s = `${value}`.toLowerCase().trim();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

/**
 * Normalizes one raw row into {@link ReportUploadListItem}. A plain `as
 * ReportUploadListItem` cast on the raw JSON silently leaves every field
 * `undefined` whenever the backend's casing doesn't match exactly (confirmed
 * mixed PascalCase/camelCase against a real login response).
 */
function toReportUploadListItem(row: Record<string, unknown>): ReportUploadListItem {
  return {
    appointmentId: numOrUndefined(pick(row, 'appointmentId', 'AppointmentId')),
    caseRegistrationMastId: numOrUndefined(pick(row, 'caseRegistrationMastId', 'CaseRegistrationMastId')),
    registeredDate: pickString(row, 'registeredDate', 'RegisteredDate') || undefined,
    appointmentDate: pickString(row, 'appointmentDate', 'AppointmentDate') || undefined,
    insuranceCompanyName: pickString(row, 'insuranceCompanyName', 'InsuranceCompanyName') || undefined,
    clientName: pickString(row, 'clientName', 'ClientName') || undefined,
    assignedName: pickString(row, 'assignedName', 'AssignedName') || undefined,
    assignedTo: numOrUndefined(pick(row, 'assignedTo', 'AssignedTo')),
    branchId: numOrUndefined(pick(row, 'branchId', 'BranchId')),
    branchName: pickString(row, 'branchName', 'BranchName') || undefined,
    isAssigned: boolOrUndefined(pick(row, 'isAssigned', 'IsAssigned')),
    totalCount: numOrUndefined(pick(row, 'totalCount', 'TotalCount')),
  };
}

export const GET_CLIENT_PHOTO_DROPDOWN_ENDPOINT = 'api/ReportUploadDropdown/GetClientPhotoDropdown';
export const GET_ID_PROOF_DROPDOWN_ENDPOINT = 'api/ReportUploadDropdown/GetIdProofDropdown';
export const GET_DC_REPORT_DROPDOWN_ENDPOINT = 'api/ReportUploadDropdown/GetDCReport';
export const GET_REPORT_UPLOAD_LIST_ENDPOINT = 'api/ReportUpload/GetReportUploadList';
export const UPLOAD_REPORT_DOCUMENT_ENDPOINT = 'api/ReportUpload/UploadReportDocument';
export const GET_REPORT_UPLOAD_VIEW_DOCUMENT_ENDPOINT = 'api/ReportUpload/GetReportUploadViewDocument';

export async function getClientPhotoDropdown(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_CLIENT_PHOTO_DROPDOWN_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Client photo options are not available right now.');
  return options;
}

/** Report-type dropdown ("DC Report") — its `value` (as a number) is sent as `documentTypeId` when uploading a report file. */
export async function getDCReportDropdown(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_DC_REPORT_DROPDOWN_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('Report type options are not available right now.');
  return options;
}

export async function getIdProofDropdown(): Promise<DdlOptionModel[]> {
  const response = await apiPostEncryptedSession(GET_ID_PROOF_DROPDOWN_ENDPOINT, {});
  const options = ddlOptionsFromResponse(response);
  if (options.length === 0) throw new Error('ID proof options are not available right now.');
  return options;
}

export interface GetReportUploadListParams {
  pageNumber?: number;
  pageSize?: number;
  insuranceId?: number;
  caseId?: number;
  appointmentId?: number;
  fromDate?: string;
  toDate?: string;
  assignedTo?: number;
  branchId?: number;
}

function toReportUploadListResponseModel(json: Record<string, unknown>): ReportUploadListResponseModel {
  const rawList = pick<unknown[]>(json, 'data', 'Data');
  return {
    success: pick<boolean>(json, 'success', 'Success'),
    statusCode: pick<number>(json, 'statusCode', 'StatusCode'),
    message: pick<string>(json, 'message', 'Message'),
    totalRecords: pick<number>(json, 'totalRecords', 'TotalRecords'),
    data: Array.isArray(rawList)
      ? rawList.filter((e) => e && typeof e === 'object').map((e) => toReportUploadListItem(e as Record<string, unknown>))
      : undefined,
  };
}

export async function getReportUploadList(params: GetReportUploadListParams = {}): Promise<ReportUploadListResponseModel> {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const cachedRow = flattenProfileEnvelope(cached);
  // The provider number captured at login, same as `getAppointmentDetailsByProvider`.
  const dcProviderNumber = pick(cachedRow, 'ProviderNumber', 'providerNumber', 'provider_number') ?? '';

  const payload = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 50,
    insuranceId: params.insuranceId ?? 0,
    caseId: params.caseId ?? 0,
    appointmentId: params.appointmentId ?? 0,
    fromDate: params.fromDate ?? '',
    toDate: params.toDate ?? '',
    assignedTo: params.assignedTo ?? 0,
    branchId: params.branchId ?? 0,
    dc_provider_number: dcProviderNumber,
  };

  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_REPORT_UPLOAD_LIST_ENDPOINT, payload);

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load the report upload list. Please try again.');
  }

  const envelope = toReportUploadListResponseModel(response);
  if (envelope.success === false) {
    throw new Error(envelope.message || 'Could not load the report upload list. Please try again.');
  }
  return envelope;
}

export interface UploadReportDocumentParams {
  caseId: number;
  appointmentId: number;
  documentTypeId?: number;
  documentTypeName?: string;
  icName?: string;
  file: File;
  remark?: string;
}

/**
 * `FileName`/`FileExtension`/`FilePath` are never sent — the backend derives
 * those from the uploaded file itself (keyed `"File"`, capital F,
 * case-sensitive) once it saves it to disk; the client only supplies the
 * case/appointment/document-type context plus `IC_Name`/`DocumentTypeName`,
 * which it uses to build that file's storage folder path.
 */
export async function uploadReportDocument({
  caseId,
  appointmentId,
  documentTypeId,
  documentTypeName,
  icName,
  file,
  remark,
}: UploadReportDocumentParams): Promise<unknown> {
  const formData = new FormData();
  formData.append('CaseId', String(caseId));
  formData.append('AppointmentId', String(appointmentId));
  if (documentTypeId != null) formData.append('DocumentTypeId', String(documentTypeId));
  if (documentTypeName) formData.append('DocumentTypeName', documentTypeName);
  if (icName) formData.append('IC_Name', icName);
  if (remark != null) formData.append('Remark', remark);
  formData.append('File', file);

  return apiPostMultipart(UPLOAD_REPORT_DOCUMENT_ENDPOINT, formData);
}

/**
 * Normalizes one raw row into {@link ReportUploadDocument}. A plain type
 * cast on the raw JSON would silently leave every field `undefined`
 * whenever the backend's casing doesn't match exactly (confirmed mixed
 * PascalCase/camelCase elsewhere in this backend).
 */
function toReportUploadDocument(row: Record<string, unknown>): ReportUploadDocument {
  return {
    reportUploadId: numOrUndefined(pick(row, 'reportUploadId', 'ReportUploadId')),
    caseId: numOrUndefined(pick(row, 'caseId', 'CaseId')),
    appointmentId: numOrUndefined(pick(row, 'appointmentId', 'AppointmentId')),
    documentTypeId: numOrUndefined(pick(row, 'documentTypeId', 'DocumentTypeId')),
    documentType: pickString(row, 'documentType', 'DocumentType') || undefined,
    identityName: pickString(row, 'identityName', 'IdentityName') || undefined,
    groupTypeId: numOrUndefined(pick(row, 'groupTypeId', 'GroupTypeId')),
    groupName: pickString(row, 'groupName', 'GroupName') || undefined,
    groupTestTypeId: numOrUndefined(pick(row, 'groupTestTypeId', 'GroupTestTypeId')),
    groupTestName: pickString(row, 'groupTestName', 'GroupTestName') || undefined,
    testMappingId: numOrUndefined(pick(row, 'testMappingId', 'TestMappingId')),
    testMappingDocumentName: pickString(row, 'testMappingDocumentName', 'TestMappingDocumentName') || undefined,
    fileName: pickString(row, 'fileName', 'FileName') || undefined,
    fileWebPath: pickString(row, 'fileWebPath', 'FileWebPath') || undefined,
    remark: pickString(row, 'remark', 'Remark') || undefined,
    finalRemark: pickString(row, 'finalRemark', 'FinalRemark') || undefined,
  };
}

/**
 * Fetches the actual uploaded file records (name, type, download path) for
 * a provider — used by the "View Report" screen to show what was
 * uploaded via {@link uploadReportDocument}, grouped by appointment. Distinct
 * from `getReportUploadList`, which only returns a per-case summary count.
 */
export async function getReportUploadViewDocuments(dcProviderId: string): Promise<ReportUploadDocument[]> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_REPORT_UPLOAD_VIEW_DOCUMENT_ENDPOINT, {
    dc_Provider_id: dcProviderId,
  });

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load uploaded documents. Please try again.');
  }

  const success = pick<boolean>(response, 'success', 'Success');
  if (success === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not load uploaded documents. Please try again.');
  }

  const rawList = pick<unknown[]>(response, 'data', 'Data');
  return Array.isArray(rawList)
    ? rawList.filter((e) => e && typeof e === 'object').map((e) => toReportUploadDocument(e as Record<string, unknown>))
    : [];
}

/**
 * Helper function to filter documents by case and appointment from the full list
 */
export function filterDocumentsByCaseAppointment(
  documents: ReportUploadDocument[],
  caseId: number,
  appointmentId: number
): ReportUploadDocument[] {
  return documents.filter(
    (doc) => (doc.caseId ?? 0) === caseId && (doc.appointmentId ?? 0) === appointmentId
  );
}
