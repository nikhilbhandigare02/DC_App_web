/** Ported from `lib/models/user_profile_model.dart`. */

/**
 * Profile fields sourced from the raw login/user payload cached in
 * storage, or from the `sp_getprofile_DC` stored procedure's
 * `{ data: [ {...} ] }` envelope. Backend key casing has been inconsistent
 * across endpoints, so every field should be read via `pick()` trying a
 * handful of common variants (see `authApi`/`profileApi` for the exact
 * key lists ported from the Dart `pick([...])` calls).
 */
export interface UserProfileModel {
  userId: string;
  username: string;
  email: string;
  dcName: string;
  fullName: string;
  providerNumber: string;
  mobileNo: string;
  address: string;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  providerLocation: string;
  providerLatitude: string;
  providerLongitude: string;
  networkType: string;
  providerType: string;
  medicalProcessType: string;
  dcGradeType: string;
  accreditation: string;
  certificateNo: string;
  isDCChain: string;
  isParent: string;
  preferredDC: string;
  parentDCId: string;
  fromDate: string;
  toDate: string;
  success: string;
  message: string;
  statusCode: string;
  roleName: string;
  logoUrl: string;
}
