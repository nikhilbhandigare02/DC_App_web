/**
 * UI-facing appointment shape, ported from the Flutter app's
 * `AppointmentModel` (`lib/screens/appointment/appointment_screen.dart`).
 * `AppointmentDetail` (the raw API row, one per test) is grouped by
 * `appointmentBookingId` into one of these per booking — see
 * {@link mapAppointmentDetailsToModels}.
 */

import type { AppointmentDetail } from '../../types/appointment';

export interface AppointmentUIModel {
  date: Date;
  /** `"HH:mm - HH:mm"`, or `"-"` when not booked. */
  time: string;
  patientName: string;
  proposalNo: string;
  /** Joined test names, e.g. `"Lipid Profile - CBC"`. */
  test: string;
  /** Not returned by the API — always `''` (kept for shape parity with the Dart model). */
  testType: string;
  /** `"Home"` | `"Centre"` | `"Home+Centre Visit"` | `""`. */
  visitType: string;
  /** Home-visit address; empty unless the visit type includes Home. */
  address?: string;
  status: string;
  subStatus: string;
  caseId: string;
  clientProfile: string;
  gender: string;
  age: number;
  mobileNo: string;
  insuranceCompany: string;
  dcName: string;
  dob: string;
  appointmentId: string;
  /** Report-review queue status: 'Needs Correction' | 'Pending' | 'Report Done'. */
  reportStatus: string;
  registeredDate: string;
  /** Only set when `reportStatus === 'Needs Correction'`. */
  correctionRemark: string;
}

/** Whole years between [dob] (ISO / date string) and today, or 0 when it can't be read. */
function ageFromDob(dob: string | undefined): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) years -= 1;
  return years > 0 && years < 130 ? years : 0;
}

const VISIT_TYPE_LABELS: Record<string, string> = { '1': 'Home', '2': 'Centre', '3': 'Home+Centre Visit' };

/**
 * Groups `GetAppointmentDetailsByProvider`/`GetAppointmentDetailsById` rows
 * by `appointmentBookingId` (one booking can carry several test rows) and
 * converts each group into an {@link AppointmentUIModel}. Ported from
 * `mapAppointmentDetailsToModels` in `appointment_screen.dart`.
 */
export function mapAppointmentDetailsToModels(details: AppointmentDetail[]): AppointmentUIModel[] {
  const byBooking = new Map<number, AppointmentDetail[]>();
  for (const detail of details) {
    const bookingId = detail.appointmentBookingId ?? -1;
    const group = byBooking.get(bookingId);
    if (group) {
      group.push(detail);
    } else {
      byBooking.set(bookingId, [detail]);
    }
  }

  return Array.from(byBooking.values()).map((rows) => {
    const first = rows[0];
    const testNames = Array.from(
      new Set(
        rows
          .map((r) => (r.testNames ?? '').trim())
          .filter((name) => name.length > 0),
      ),
    ).join(' - ');

    const date = first.appointmentDate ? new Date(first.appointmentDate) : new Date();
    const parsedDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const slot = first.appointmentSlot;
    const time = !slot || slot.trim() === '' || slot.trim() === 'null' ? '-' : slot;

    return {
      date: parsedDate,
      time,
      patientName: first.applicantName ?? '',
      proposalNo: first.proposalNo ?? '',
      test: testNames || '-',
      testType: '',
      // Same legend as tbl_visit_type_master / the Visit Type dropdown.
      visitType: VISIT_TYPE_LABELS[first.visitType ?? ''] ?? '',
      address: first.address?.trim() ?? '',
      status: first.appointmentStatusName ?? 'Pending',
      subStatus: first.appointmentSubStatusName ?? '',
      caseId: first.caseRegistrationMastId != null ? String(first.caseRegistrationMastId) : '',
      clientProfile: 'Normal',
      gender: first.genderName ?? '',
      // The case row may carry no age — derive it from the date of birth when so.
      age: first.age || ageFromDob(first.dateOfBirth),
      mobileNo: first.mobileNumber ?? '',
      insuranceCompany: first.insuranceCompanyName ?? '',
      dcName: first.providerName ?? '',
      dob: first.dateOfBirth ?? '',
      appointmentId: first.appointmentBookingId != null ? String(first.appointmentBookingId) : '',
      reportStatus: 'Pending',
      registeredDate: first.insertedDate ?? '',
      correctionRemark: '',
    } satisfies AppointmentUIModel;
  });
}

/** Background/foreground color pair for a status badge, keyed by status text. */
export interface StatusColor {
  background: string;
  foreground: string;
}

/** Ported from `_statusColorFor` (appointment_screen_web.dart / appointment_detail_view.dart). */
export function statusColorFor(status: string): StatusColor {
  switch (status.toLowerCase()) {
    case 'fixed':
      return { background: 'var(--color-success-pale)', foreground: 'var(--color-success)' };
    case 'confirmed':
      return { background: 'var(--color-info-pale)', foreground: 'var(--color-info)' };
    case 'pending':
      return { background: 'var(--color-warning-pale)', foreground: 'var(--color-warning)' };
    case 'cancelled':
    case 'canceled':
      return { background: 'var(--color-error-pale)', foreground: 'var(--color-error)' };
    case 'completed':
      return { background: 'var(--color-accent-pale)', foreground: 'var(--color-accent-dark)' };
    default:
      return { background: 'var(--color-primary-pale)', foreground: 'var(--color-primary)' };
  }
}

/** Ported from `_reportStatusStyle` (upload_report_screen.dart). */
export function reportStatusStyle(status: string): StatusColor & { hasIcon: boolean } {
  switch (status) {
    case 'Needs Correction':
      return { background: 'var(--color-error-pale)', foreground: 'var(--color-error)', hasIcon: true };
    case 'Report Done':
      return { background: 'var(--color-success-pale)', foreground: 'var(--color-success)', hasIcon: false };
    default:
      return { background: 'var(--color-warning-pale)', foreground: 'var(--color-warning)', hasIcon: false };
  }
}

/** `dd MMM yyyy` formatting used throughout the appointments/upload-report screens. */
export function formatDate(
  date: Date,
  pattern: 'dd MMM yyyy' | 'dd-MMM-yyyy' | 'dd-MM-yyyy' = 'dd MMM yyyy',
): string {
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  if (pattern === 'dd-MM-yyyy') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${year}`;
  }
  const month = date.toLocaleString('en-US', { month: 'short' });
  return pattern === 'dd-MMM-yyyy' ? `${day}-${month}-${year}` : `${day} ${month} ${year}`;
}

/**
 * Reformats a raw API date value (e.g. `"1998-03-12T00:00:00"`) to
 * `dd-MM-yyyy` for display. Values already in `dd-MM-yyyy`, and anything
 * that doesn't parse as a date, are returned unchanged rather than risking
 * a garbled re-format.
 */
export function formatDobValue(value: string): string {
  if (!value) return value;
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return formatDate(parsed, 'dd-MM-yyyy');
}

export function isSameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Splits a joined test-names string — e.g. `"abx, bcd, sfsd"` (a row's raw
 * comma-separated `testNames`) or `"Lipid Profile - CBC"` (several rows
 * joined by `mapAppointmentDetailsToModels`) — into individual trimmed test
 * names, so the Test Type filter can offer/match each one separately instead
 * of the whole blob as one option. Splits on literal `", "`/`","` and
 * `" - "` (spaces required around the dash, so it doesn't break names that
 * contain a hyphen themselves, e.g. "X-Ray").
 */
export function splitTestNames(value: string): string[] {
  if (!value || value === '-') return [];
  return value
    .split(/\s*,\s*| - /)
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && name !== '-');
}
