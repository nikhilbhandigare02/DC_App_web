/** Ported from `lib/models/appointment_details_model.dart`. */

/**
 * A single row from `appointmentDetailsData` — one test within one
 * appointment booking. One appointment booking (`appointmentBookingId`)
 * can carry several test rows (each with its own `testIds`/`testNames` but
 * otherwise identical fields), so the raw list has to be grouped by booking
 * id before use.
 */
export interface AppointmentDetail {
  dcProviderId?: number;
  providerNumber?: string;
  providerName?: string;
  testIds?: string;
  testNames?: string;
  /** ISO 8601, e.g. `"2026-08-25T00:00:00"`. */
  appointmentDate?: string;
  mobileNumber?: string;
  /** `"HH:mm - HH:mm"`, or the literal string `"null"` when not booked yet. */
  appointmentSlot?: string;
  visitType?: string;
  appointmentStatus?: number;
  appointmentStatusName?: string;
  appointmentSubStatus?: number;
  appointmentSubStatusName?: string;
  appointmentBookingId?: number;
  caseRegistrationMastId?: number;
  proposalNo?: string;
  applicantName?: string;
  insuranceCompanyId?: number;
  insertedDate?: string;
  insuranceCompanyName?: string;
  age?: number;
  dateOfBirth?: string;
  genderId?: number;
  genderName?: string;
}

/**
 * Response envelope for `POST api/Appointment/GetAppointmentDetailsByProvider`
 * and `POST api/Appointment/GetAppointmentDetailsById`.
 */
export interface AppointmentModel {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: AppointmentDetail[];
}
