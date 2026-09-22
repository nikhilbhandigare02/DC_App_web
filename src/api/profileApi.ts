/** Ported from `lib/repository/profile_repository.dart`. */

import { apiPostEncryptedSession } from '../lib/apiClient';
import { getUserData, setUserData } from '../lib/storage';
import { pick } from '../utils/pick';
import type { UserProfileModel } from '../types/profile';

/** Profile endpoint backed by the `sp_getprofile_DC` stored procedure. */
export const GET_PROFILE_ENDPOINT = 'api/Auth/GetProfile';

/**
 * Unwraps the `{ data: [ {...} ] }` envelope the profile stored procedure
 * returns down to the single row, leaving a plain object untouched.
 */
export function flattenProfileEnvelope(json: Record<string, unknown>): Record<string, unknown> {
  for (const key of ['data', 'Data', 'result', 'Result']) {
    const value = json[key];
    if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object') {
      return value[0] as Record<string, unknown>;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
      return value as Record<string, unknown>;
    }
  }
  return json;
}

function pickStr(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value != null && `${value}`.trim() !== '') return `${value}`;
  }
  return '';
}

export function toUserProfileModel(json: Record<string, unknown>): UserProfileModel {
  const source = flattenProfileEnvelope(json);

  const address1 = pickStr(source, ['Address1', 'address1']);
  const address2 = pickStr(source, ['Address2', 'address2']);
  const address3 = pickStr(source, ['Address3', 'address3']);
  const address = [address1, address2, address3].filter((line) => line.length > 0).join(', ');

  return {
    userId: pickStr(source, ['UserId', 'userId', 'UserID', 'DCLoginUserId', 'dc_login_user_id']),
    username: pickStr(source, ['Username', 'UserName', 'username']),
    email: pickStr(source, ['Email', 'EmailId', 'emailId', 'EmailAddress', 'UserMailId', 'email']),
    dcName: pickStr(source, ['DCName', 'DcName', 'DiagnosticCenterName', 'CenterName', 'dcName', 'dc_name']),
    fullName: pickStr(source, ['FullName', 'fullName', 'ProviderName', 'provider_name', 'ProviderDisplayName']),
    providerNumber: pickStr(source, [
      'ProviderNumber',
      'providerNumber',
      'provider_number',
      'DCProviderNumber',
      'ProviderNo',
      'ProviderId',
    ]),
    mobileNo: pickStr(source, ['MobileNo', 'mobileNo', 'TelephoneNo', 'telephone_no', 'Mobile', 'PhoneNumber']),
    address,
    address1,
    address2,
    address3,
    city: pickStr(source, ['CityName', 'cityName', 'City']),
    district: pickStr(source, ['DistrictName', 'districtName', 'District']),
    state: pickStr(source, ['StateName', 'stateName', 'State']),
    pincode: pickStr(source, ['Pincode', 'pincode', 'PinCode', 'ZipCode']),
    providerLocation: pickStr(source, ['ProviderLocation', 'providerLocation', 'provider_location', 'Location']),
    providerLatitude: pickStr(source, ['ProviderLatitude', 'providerLatitude', 'provider_latitude', 'Latitude']),
    providerLongitude: pickStr(source, ['ProviderLongitude', 'providerLongitude', 'provider_longitude', 'Longitude']),
    networkType: pickStr(source, ['NetworkType', 'networkType', 'network_type']),
    providerType: pickStr(source, ['ProviderType', 'providerType', 'provider_type']),
    medicalProcessType: pickStr(source, ['MedicalProcessType', 'medicalProcessType', 'medical_process_type']),
    dcGradeType: pickStr(source, ['DCGradeType', 'dcGradeType', 'dc_grade_type', 'GradeType']),
    accreditation: pickStr(source, ['Accreditation', 'accreditation']),
    certificateNo: pickStr(source, ['CertificateNo', 'certificateNo', 'certificate_no', 'CertificateNumber']),
    isDCChain: pickStr(source, ['IsDCChain', 'isDCChain', 'is_dc_chain']),
    isParent: pickStr(source, ['IsParent', 'isParent', 'is_parent']),
    preferredDC: pickStr(source, ['PreferredDC', 'preferredDC', 'prefered_dc', 'PreferredDcId']),
    parentDCId: pickStr(source, ['ParentDCId', 'parentDCId', 'parent_dc_id', 'ParentDcId']),
    fromDate: pickStr(source, ['FromDate', 'fromDate', 'from_date', 'EmpanelmentFromDate']),
    toDate: pickStr(source, ['ToDate', 'toDate', 'to_date', 'EmpanelmentToDate', 'ValidTill']),
    success: pickStr(source, ['Success', 'success']),
    message: pickStr(source, ['Message', 'message']),
    statusCode: pickStr(source, ['StatusCode', 'statusCode', 'status_code']),
    roleName: pickStr(source, ['RoleName', 'roleName', 'role_name', 'Role', 'UserRole']),
    logoUrl: pickStr(source, [
      'LogoUrl',
      'logoUrl',
      'logo_url',
      'Logo',
      'logo',
      'ImageUrl',
      'imageUrl',
      'image_url',
      'ProfileImage',
      'profileImage',
      'profile_image',
      'DCLogo',
      'dcLogo',
      'dc_logo',
    ]),
  };
}

/** True only when the body carries a `Success` flag explicitly set to false. An absent flag is not a failure. */
function isExplicitFailure(envelope: Record<string, unknown>): boolean {
  const success = envelope.Success ?? envelope.success;
  if (success === undefined || success === null) return false;
  if (typeof success === 'boolean') return !success;
  const value = `${success}`.toLowerCase().trim();
  return value === 'false' || value === '0' || value === 'no';
}

export function getCachedProfile(): UserProfileModel | null {
  const cached = getUserData();
  if (!cached || Object.keys(cached).length === 0) return null;
  return toUserProfileModel(cached);
}

export async function fetchProfile(): Promise<UserProfileModel> {
  const cached = (getUserData() ?? {}) as Record<string, unknown>;
  const cachedRow = flattenProfileEnvelope(cached);

  const payload: Record<string, unknown> = {};
  const userId = pick(cachedRow, 'UserId', 'userId', 'UserID');
  const username = pick(cachedRow, 'Username', 'UserName', 'username');
  const providerNumber = pick(cachedRow, 'ProviderNumber', 'providerNumber', 'provider_number');
  if (userId != null) payload.UserId = userId;
  if (username != null) payload.Username = username;
  if (providerNumber != null) payload.ProviderNumber = providerNumber;

  const response = await apiPostEncryptedSession<Record<string, unknown>>(GET_PROFILE_ENDPOINT, payload);

  if (!response || typeof response !== 'object') {
    throw new Error('Could not load centre information. Please try again.');
  }

  if (isExplicitFailure(response)) {
    const message = pick<string>(response, 'Message', 'message');
    throw new Error(message || 'Centre information is not available for this account.');
  }

  const row = flattenProfileEnvelope(response);
  const merged = { ...cachedRow, ...row };
  setUserData(merged);
  return toUserProfileModel(merged);
}
