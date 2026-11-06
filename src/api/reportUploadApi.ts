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
import type { DcRejectedCase, RejectedQcDocument, ReportUploadDocument, ReportUploadListItem, ReportUploadListResponseModel } from '../types/report';

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
  /** `true` when this file re-uploads a QC-rejected document; sent as `IsNew` (saved to `is_new`). */
  isNew?: boolean;
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
  isNew = false,
}: UploadReportDocumentParams): Promise<unknown> {
  const formData = new FormData();
  formData.append('CaseId', String(caseId));
  formData.append('AppointmentId', String(appointmentId));
  if (documentTypeId != null) formData.append('DocumentTypeId', String(documentTypeId));
  if (documentTypeName) formData.append('DocumentTypeName', documentTypeName);
  if (icName) formData.append('IC_Name', icName);
  if (remark != null) formData.append('Remark', remark);
  formData.append('IsNew', String(isNew));
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

export const GET_DC_REJECTED_CASES_ENDPOINT = 'api/ReportUpload/GetDCRejectedCasesByQc';

/** Normalizes one raw row of `GetDCRejectedCasesByQc`'s `data` array. */
function toDcRejectedCase(row: Record<string, unknown>): DcRejectedCase {
  return {
    reportUploadId: numOrUndefined(pick(row, 'reportUploadId', 'ReportUploadId')),
    appointmentId: numOrUndefined(pick(row, 'appointmentId', 'AppointmentId')),
    caseId: numOrUndefined(pick(row, 'caseId', 'CaseId')),
    dcProviderId: numOrUndefined(pick(row, 'dcProviderId', 'DcProviderId')),
    appointmentDate: pickString(row, 'appointmentDate', 'AppointmentDate') || undefined,
    providerName: pickString(row, 'providerName', 'ProviderName') || undefined,
    insuranceCompanyId: numOrUndefined(pick(row, 'insuranceCompanyId', 'InsuranceCompanyId')),
    companyName: pickString(row, 'companyName', 'CompanyName') || undefined,
    clientName: pickString(row, 'clientName', 'ClientName') || undefined,
  };
}

/** The logged-in DC's provider id saved at login (e.g. 10033), or 0 when it isn't there. */
function storedDcProviderId(): number {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const keys = [
    'dc_Provider_id',
    'Dc_Provider_id',
    'DcProviderId',
    'dcProviderId',
    'DCProviderId',
    'ProviderNumber',
    'providerNumber',
    'provider_number',
  ];
  const value = pickString(cached, ...keys) || pickString(flattenProfileEnvelope(cached), ...keys);
  return Number(value) || 0;
}

/** Cases QC rejected for this DC — filtered by the provider id (`dc_Provider_id`) captured at login, same as the View Report list. */
export async function getDcRejectedCases(): Promise<DcRejectedCase[]> {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const keys = [
    'dc_Provider_id',
    'Dc_Provider_id',
    'DcProviderId',
    'dcProviderId',
    'DCProviderId',
    'ProviderNumber',
    'providerNumber',
    'provider_number',
  ];
  // Value saved at login (e.g. 10033): check the raw payload, then its flattened `data` row.
  const dcProviderId =
    pickString(cached, ...keys) || pickString(flattenProfileEnvelope(cached), ...keys);
  if (!dcProviderId) {
    throw new Error('Provider ID not found. Please login again.');
  }

  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_DC_REJECTED_CASES_ENDPOINT, {
    dc_Provider_id: String(dcProviderId),
  });

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load the discrepancy list. Please try again.');
  }
  if (pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not load the discrepancy list. Please try again.');
  }

  const rawList = pick<unknown[]>(response, 'data', 'Data');
  return Array.isArray(rawList)
    ? rawList.filter((e) => e && typeof e === 'object').map((e) => toDcRejectedCase(e as Record<string, unknown>))
    : [];
}

export const GET_REJECT_QC_REPORT_LIST_ENDPOINT = 'api/ReportUpload/GetRejectQcReportListDc';

/** The documents of one case/appointment that QC rejected (`remark` is the reviewer's reason for each). */
export async function getRejectQcReportList(caseId: number, appointmentId: number): Promise<RejectedQcDocument[]> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_REJECT_QC_REPORT_LIST_ENDPOINT, {
    caseId,
    appointmentId,
  });

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load the rejected documents. Please try again.');
  }
  if (pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not load the rejected documents. Please try again.');
  }

  const rawList = pick<unknown[]>(response, 'data', 'Data');
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((e) => e && typeof e === 'object')
    .map((e) => {
      const row = e as Record<string, unknown>;
      return {
        ...toReportUploadDocument(row),
        qcRemark: pickString(row, 'qcRemark', 'QCRemark', 'QcRemark') || undefined,
        passFailResult: boolOrUndefined(pick(row, 'passFailResult', 'PassFailResult')) ?? null,
        documentDisplayName: pickString(row, 'documentDisplayName', 'DocumentDisplayName') || undefined,
        reuploadedReportUploadId: numOrUndefined(pick(row, 'reuploadedReportUploadId', 'ReuploadedReportUploadId')),
        reuploadedDocumentTypeId: numOrUndefined(pick(row, 'reuploadedDocumentTypeId', 'ReuploadedDocumentTypeId')),
        reuploadedTypeName: pickString(row, 'reuploadedTypeName', 'ReuploadedTypeName') || undefined,
        dcReportUploadId: numOrUndefined(pick(row, 'dcReportUploadId', 'DcReportUploadId')),
        isNew: boolOrUndefined(pick(row, 'isNew', 'IsNew')),
      };
    });
}

export const UPDATE_REPORT_REMARK_ENDPOINT = 'api/ReportUpload/UpdateReportRemark';

/**
 * Writes the final remark onto the case/appointment's report master row
 * (`tbl_report_mast_dc`) — called from the page's Save action so the saved
 * remark reflects whatever is in the field now, not what it was at each
 * document's upload time.
 */
export async function updateReportRemark(caseId: number, appointmentId: number, remark: string): Promise<void> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(UPDATE_REPORT_REMARK_ENDPOINT, {
    caseId,
    appointmentId,
    remark,
  });

  if (response && typeof response === 'object' && pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not save the remark. Please try again.');
  }
}

export interface AppointmentTest {
  id: number;
  name: string;
  /** 0 for an individually booked test. */
  packageId: number;
}

export const GET_TESTS_BY_APPOINTMENT_ENDPOINT = 'api/Appointment/GetTestsByAppointment';

/** The active tests of one appointment, with the PackageId the follow-up save needs. */
export async function getTestsByAppointment(appointmentId: number): Promise<AppointmentTest[]> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_TESTS_BY_APPOINTMENT_ENDPOINT, {
    appointmentBookingId: appointmentId,
  });
  if (!response || typeof response !== 'object') return [];
  if (pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not load the tests.');
  }
  const data = pick<unknown>(response, 'data', 'Data');
  if (!Array.isArray(data)) return [];
  return data
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      id: Number(pick(row, 'id', 'Id')) || 0,
      name: pickString(row, 'name', 'Name'),
      packageId: Number(pick(row, 'packageId', 'PackageId')) || 0,
    }))
    .filter((t) => t.id > 0);
}

export interface RecallStatus {
  statusId: number;
  subStatusId: number;
}

export const GET_RECALL_STATUS_ENDPOINT = 'api/Appointment/GetRecallStatus';

/** The Recall Later status and callback sub status ids, looked up in the status tables. */
export async function getRecallStatus(): Promise<RecallStatus> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_RECALL_STATUS_ENDPOINT, {});
  if (pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not load the recall status.');
  }
  const data = pick<Record<string, unknown>>(response, 'data', 'Data');
  const statusId = Number(data && pick(data, 'statusId', 'StatusId')) || 0;
  const subStatusId = Number(data && pick(data, 'subStatusId', 'SubStatusId')) || 0;
  if (statusId <= 0 || subStatusId <= 0) throw new Error('Recall status not found.');
  return { statusId, subStatusId };
}

export const SAVE_FOLLOW_UP_ENDPOINT ='api/Appointment/SaveFollowUpCaseDetails';

export interface MissedStatusRow {
  statusId: number;
  statusName: string;
  subStatusId: number;
  subStatusName: string;
}

export const GET_MISSED_STATUSES_ENDPOINT = 'api/Appointment/GetMissedStatuses';

/** Recall Later (9) and Non Contactable (10) rows with their sub statuses, from the status tables. */
export async function getMissedStatuses(): Promise<MissedStatusRow[]> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_MISSED_STATUSES_ENDPOINT, {});
  if (pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not load the statuses.');
  }
  const data = pick<unknown>(response, 'data', 'Data');
  if (!Array.isArray(data)) return [];
  return data
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      statusId: Number(pick(row, 'statusId', 'StatusId')) || 0,
      statusName: pickString(row, 'statusName', 'StatusName'),
      subStatusId: Number(pick(row, 'subStatusId', 'SubStatusId')) || 0,
      subStatusName: pickString(row, 'subStatusName', 'SubStatusName'),
    }))
    .filter((r) => r.statusId > 0 && r.subStatusId > 0);
}

/**
 * "Missed" (No Show, 27/55): the appointment moves to a new status. Recall Later (9)
 * carries a callback date and time; Non Contactable / NNR (10) is status only —
 * the same No Show save the Show/No Show follow-up uses.
 */
export async function saveMissedAppointment(params: {
  caseId: number;
  appointmentId: number;
  statusId: number;
  subStatusId: number;
  remarks?: string;
  /** yyyy-MM-dd — Recall Later only. */
  recallDate?: string;
  /** HH:mm — Recall Later only. */
  recallTime?: string;
}): Promise<void> {
  const { caseId, appointmentId, statusId, subStatusId, remarks, recallDate, recallTime } = params;
  const isRecall = Boolean(recallDate && recallTime);
  const response = await apiPostEncryptedSession<Record<string, unknown>>(SAVE_FOLLOW_UP_ENDPOINT, {
    case_registration_mast_id: caseId,
    appointmentId,
    appointment_status: 27,
    appointment_sub_status: 55,
    by_whom: 0,
    visit_type: 0,
    remarks: remarks ?? '',
    new_dc_provider_id: storedDcProviderId(),
    appointment_slot: '',
    Appointments: [
      {
        Status: statusId,
        SubStatus: subStatusId,
        CallBack: isRecall ? `${recallDate} ${recallTime}:00` : '',
        DCProviderId: storedDcProviderId(),
        VisitType: 0,
        AppointmentType: 0,
        ...(isRecall ? { AppointmentDate: recallDate } : {}),
        AppointmentSlot: '',
        Remarks: remarks ?? '',
        PackageTests: [],
      },
    ],
  });

  if (response && typeof response === 'object' && pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not save. Please try again.');
  }
}

/**
 * "Appointment Done" with tests: the ticked tests are the ones completed (Show,
 * 26/54). When some are left, they go to a new Recall Later (9) appointment with
 * the callback date and time — same save the Show/No Show follow-up uses.
 */
export async function saveShowFollowUp(params: {
  caseId: number;
  appointmentId: number;
  doneTests: AppointmentTest[];
  remainingTests: AppointmentTest[];
  /** Recall status ids from `getRecallStatus`; needed when tests remain. */
  recallStatus?: RecallStatus;
  /** yyyy-MM-dd */
  recallDate?: string;
  /** HH:mm */
  recallTime?: string;
}): Promise<void> {
  const { caseId, appointmentId, doneTests, remainingTests, recallStatus, recallDate, recallTime } = params;
  if (remainingTests.length > 0 && !recallStatus) throw new Error('Recall status not found.');
  const dcProviderId = storedDcProviderId();
  if (remainingTests.length > 0 && dcProviderId <= 0) throw new Error('Provider ID not found. Please login again.');
  const response = await apiPostEncryptedSession<Record<string, unknown>>(SAVE_FOLLOW_UP_ENDPOINT, {
    case_registration_mast_id: caseId,
    appointmentId,
    appointment_status: 26,
    appointment_sub_status: 54,
    by_whom: 0,
    visit_type: 0,
    remarks: '',
    new_dc_provider_id: dcProviderId,
    appointment_slot: '',
    selected_test_ids: doneTests.map((t) => t.id).join(','),
    ...(remainingTests.length > 0
      ? {
          Appointments: [
            {
              Status: recallStatus?.statusId ?? 0,
              SubStatus: recallStatus?.subStatusId ?? 0,
              CallBack: `${recallDate} ${recallTime}:00`,
              DCProviderId: dcProviderId,
              VisitType: 0,
              AppointmentType: 0,
              AppointmentDate: recallDate,
              AppointmentSlot: '',
              PackageTests: remainingTests.map((t) => ({ PackageId: t.packageId, TestId: t.id })),
            },
          ],
        }
      : {}),
  });

  if (response && typeof response === 'object' && pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not complete the appointment. Please try again.');
  }
}

export const APPOINTMENT_DONE_ENDPOINT = 'api/ReportUpload/AppointmentDone';

/** "Appointment Done": marks the appointment completed, with or without uploaded documents. */
export async function appointmentDone(appointmentId: number): Promise<void> {
  const response = await apiPostEncryptedSession<Record<string, unknown>>(APPOINTMENT_DONE_ENDPOINT, {
    appointmentId,
  });

  if (response && typeof response === 'object' && pick<boolean>(response, 'success', 'Success') === false) {
    throw new Error(pickString(response, 'message', 'Message') || 'Could not complete the appointment. Please try again.');
  }
}

export const UPDATE_REPORT_DOCUMENT_ENDPOINT ='api/ReportUpload/UpdateReportDocument';

/** The `reportUploadId` of the row `uploadReportDocument` just inserted, or undefined when the response doesn't carry one. */
export function uploadedReportId(response: unknown): number | undefined {
  if (!response || typeof response !== 'object') return undefined;
  return numOrUndefined(pick(response as Record<string, unknown>, 'reportUploadId', 'ReportUploadId'));
}

export interface UpdateReportDocumentParams {
  /** `reportUploadId` returned when the document was re-uploaded. */
  reportUploadId: number;
  caseId: number;
  appointmentId: number;
  documentTypeId?: number;
  documentTypeName?: string;
  icName?: string;
  file: File;
}

/**
 * "Edit" on an already re-uploaded document: replaces that row's file in the
 * database instead of inserting another row.
 */
export async function updateReportDocument({
  reportUploadId,
  caseId,
  appointmentId,
  documentTypeId,
  documentTypeName,
  icName,
  file,
}: UpdateReportDocumentParams): Promise<unknown> {
  const formData = new FormData();
  formData.append('ReportUploadId', String(reportUploadId));
  formData.append('CaseId', String(caseId));
  formData.append('AppointmentId', String(appointmentId));
  if (documentTypeId != null) formData.append('DocumentTypeId', String(documentTypeId));
  if (documentTypeName) formData.append('DocumentTypeName', documentTypeName);
  if (icName) formData.append('IC_Name', icName);
  formData.append('File', file);

  return apiPostMultipart(UPDATE_REPORT_DOCUMENT_ENDPOINT, formData);
}
