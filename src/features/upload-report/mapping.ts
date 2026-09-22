import type { ReportUploadListItem } from '../../types/report';
import type { AppointmentUIModel } from '../appointments/types';

/** `dd-MM-yyyy` (the format `GetReportUploadList` returns dates in) -> `Date`. */
function parseDdMmYyyy(value: string | undefined): Date {
  const parts = value?.split('-');
  if (!parts || parts.length !== 3) return new Date();
  const [day, month, year] = parts.map((p) => Number(p));
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return new Date();
  return new Date(year, month - 1, day);
}

/**
 * Maps `GetReportUploadList` rows to the {@link AppointmentUIModel} shape
 * shared with the Appointments/Client Information screens. Ported from
 * `_mapReportUploadItemsToModels` (upload_report_screen.dart) — the endpoint
 * doesn't return a report-review status or correction remark yet, so every
 * row defaults to 'Pending'.
 */
export function mapReportUploadItemsToModels(items: ReportUploadListItem[]): AppointmentUIModel[] {
  // `GetReportUploadList` can return the same case more than once (seen with
  // identical rows back to back) — de-dupe by case+appointment so the table
  // doesn't show the same case twice.
  const seenKeys = new Set<string>();
  const deduped = items.filter((item) => {
    const key = `${item.caseRegistrationMastId ?? ''}-${item.appointmentId ?? ''}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  return deduped.map((item) => ({
    date: parseDdMmYyyy(item.appointmentDate),
    time: '-',
    patientName: item.clientName ?? '',
    proposalNo: '',
    test: '-',
    testType: '',
    visitType: '',
    status: 'Fixed',
    subStatus: '',
    caseId: item.caseRegistrationMastId != null ? String(item.caseRegistrationMastId) : '',
    clientProfile: 'Normal',
    gender: '',
    age: 0,
    mobileNo: '',
    insuranceCompany: item.insuranceCompanyName ?? '',
    dcName: item.branchName ?? '',
    dob: '',
    appointmentId: item.appointmentId != null ? String(item.appointmentId) : '',
    reportStatus: 'Pending',
    registeredDate: item.registeredDate ?? '',
    correctionRemark: '',
  }));
}

/** `"CS-xxxxx"` short case reference derived from the Case ID, ported from `_caseCode`. */
export function caseCode(item: AppointmentUIModel): string {
  const digits = item.caseId.length >= 5 ? item.caseId.slice(-5) : item.caseId;
  return `CS-${digits}`;
}
