/** Ported from `lib/models/report_upload_list_model.dart`. */

/** A single row from `data` — one case in the report-upload queue. */
export interface ReportUploadListItem {
  appointmentId?: number;
  caseRegistrationMastId?: number;
  /** `dd-MM-yyyy`, e.g. `"10-09-2026"`. */
  registeredDate?: string;
  /** `dd-MM-yyyy`, e.g. `"09-09-2026"`. */
  appointmentDate?: string;
  insuranceCompanyName?: string;
  clientName?: string;
  assignedName?: string;
  assignedTo?: number;
  branchId?: number;
  branchName?: string;
  isAssigned?: boolean;
  totalCount?: number;
}

/** Response envelope for `POST api/ReportUpload/GetReportUploadList`. */
export interface ReportUploadListResponseModel {
  success?: boolean;
  statusCode?: number;
  message?: string;
  totalRecords?: number;
  data?: ReportUploadListItem[];
}

/**
 * Ported from `lib/models/report_upload_document_model.dart`. A single
 * uploaded file, as returned per appointment by
 * `GetReportUploadViewDocument` — distinct from {@link ReportUploadListItem},
 * which is just the per-case summary count shown on the Report Upload queue.
 */
export interface ReportUploadDocument {
  reportUploadId?: number;
  caseId?: number;
  appointmentId?: number;
  documentTypeId?: number;
  documentType?: string;
  /** The picker group this was uploaded under — e.g. "ID Proof", "Client Photo", or empty for a plain report document. */
  identityName?: string;
  groupTypeId?: number;
  groupName?: string;
  groupTestTypeId?: number;
  groupTestName?: string;
  testMappingId?: number;
  testMappingDocumentName?: string;
  fileName?: string;
  /** Fully-qualified URL the file can be downloaded/previewed from. */
  fileWebPath?: string;
  remark?: string;
  finalRemark?: string;
}

/** Response envelope for `POST api/ReportUpload/GetReportUploadViewDocument`. */
export interface ReportUploadDocumentResponseModel {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: ReportUploadDocument[];
}

/** One item of `GetDCRejectedCasesByQc`'s `data` array. */
export interface DcRejectedCase {
  reportUploadId?: number;
  appointmentId?: number;
  caseId?: number;
  dcProviderId?: number;
  /** `M/d/yyyy h:mm:ss AM`, e.g. `"10/1/2026 12:00:00 AM"`. */
  appointmentDate?: string;
  providerName?: string;
  insuranceCompanyId?: number;
  companyName?: string;
  clientName?: string;
}

/** One item of `GetRejectQcReportListDc`'s `data` array — a document QC rejected. */
export interface RejectedQcDocument extends ReportUploadDocument {
  /** The QC reviewer's remark for this specific document. */
  qcRemark?: string;
  /** `false` = failed QC; `true` = passed; `null` = not reviewed. */
  passFailResult?: boolean | null;
  documentDisplayName?: string;
}
