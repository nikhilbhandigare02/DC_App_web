/** Ported from `lib/repository/file_upload_repository.dart`. */

import { apiPostMultipart } from '../lib/apiClient';

export const UPLOAD_DOCUMENTS_ENDPOINT = 'api/FileUpload/UploadDocuments';

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
