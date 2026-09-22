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
