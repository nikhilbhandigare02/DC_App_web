/** Ported from `lib/repository/file_upload_repository.dart`. */

import { apiPostMultipart } from '../lib/apiClient';

export const UPLOAD_DOCUMENTS_ENDPOINT = 'api/FileUpload/UploadDocuments';
export const SAVE_DOCTOR_REQUEST_DOCUMENT_ENDPOINT = 'api/FileUpload/SaveDoctorRequestDocument';

export interface UploadDocumentsParams {
  empanelmentMastId: number;
  documentType: number;
  isMandatory: boolean;
  documentId?: number;
  file: File;
}

/**
 * Uploads a single document (e.g. a doctor's certificate) — plain multipart,
 * no encryption.
 */
export async function uploadDocuments({
  empanelmentMastId,
  documentType,
  isMandatory,
  documentId = 0,
  file,
}: UploadDocumentsParams): Promise<unknown> {
  const formData = new FormData();
  formData.append('empanelmentMastId', String(empanelmentMastId));
  formData.append('documentType', String(documentType));
  formData.append('isMandatory', String(isMandatory));
  formData.append('documentId', String(documentId));
  formData.append('files', file);

  return apiPostMultipart(UPLOAD_DOCUMENTS_ENDPOINT, formData);
}

export interface SaveDoctorRequestDocumentParams {
  empanelmentMastId: number;
  /** `DoctorRequestId` from `SaveDoctorUpdateRequest` (request row for a new doctor, history row for an update). */
  requestId: number;
  /**
   * `DoctorDetailsId` from `SaveDoctorUpdateRequest`: the edited doctor's id, or for a new doctor the id the save
   * inserted into `tbl_doctor_request_details_dc`. Stored as `doctor_details_id`.
   */
  doctorDetailsId: number;
  /** True when the doctor was just added (an update copies the document on file into the old_* columns). */
  isNewDoctor: boolean;
  documentType: number;
  file: File;
}

/**
 * Saves a doctor's document (e.g. the certificate) with the doctor request. Unlike
 * {@link uploadDocuments} the record goes to `tbl_doctor_request_documents_dc` (old vs new file),
 * not to the empanelment's provider documents. Plain multipart, no encryption.
 */
export async function saveDoctorRequestDocument({
  empanelmentMastId,
  requestId,
  doctorDetailsId,
  isNewDoctor,
  documentType,
  file,
}: SaveDoctorRequestDocumentParams): Promise<unknown> {
  const formData = new FormData();
  formData.append('empanelmentMastId', String(empanelmentMastId));
  formData.append('requestId', String(requestId));
  formData.append('doctorDetailsId', String(doctorDetailsId));
  formData.append('isNewDoctor', String(isNewDoctor));
  formData.append('documentType', String(documentType));
  formData.append('file', file);

  return apiPostMultipart(SAVE_DOCTOR_REQUEST_DOCUMENT_ENDPOINT, formData);
}
