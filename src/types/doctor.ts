/**
 * Ported from `lib/models/doctor_model.dart` and
 * `lib/models/provider_doctor_details_model.dart`.
 */

/** Local/editable doctor form shape (`DoctorModel` in the Dart app). */
export interface DoctorModel {
  id: string;
  specialityType: string;
  name: string;
  contactNo: string;
  medicalRegistrationNo: string;
  qualification: string;
  specialty: string;
  certificatePath?: string | null;
  approvedByTPA: boolean;
  /** ISO date string. */
  effectiveDate: string;
  /** ISO date string. */
  toDate: string;
}

/** A single doctor row from `POST api/Empanelment/GetProviderDoctorDetails`. */
export interface ProviderDoctorDetail {
  empanelmentMastId?: number;
  providerNo?: number;
  providerName?: string;
  doctorId?: number;
  doctorName?: string;
  doctorType?: string;
  contactNo?: string;
  qualification?: string;
  medicalRegistrationNo?: string;
  speciality?: string;
  /** `dd-MM-yyyy`, e.g. `"29-07-2026"`. */
  fromDate?: string;
  /** `dd-MM-yyyy`, e.g. `"03-08-2026"`. */
  toDate?: string;
}

/** Response envelope for `POST api/Empanelment/GetProviderDoctorDetails`. */
export interface ProviderDoctorDetailsResponseModel {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: ProviderDoctorDetail[];
}
