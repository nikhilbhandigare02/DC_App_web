/** Ported from `lib/repository/facility_repository.dart`. */

import { apiPostEncryptedMultipartSession } from '../lib/apiClient';

export const SAVE_FACILITY_OUTSOURCE_DETAILS_ENDPOINT = 'api/FileUpload/SaveFacilityOutsourceDetails';

export interface SaveFacilityOutsourceDetailsParams {
  data: Record<string, unknown>;
  dcPhotoFile?: File | null;
  dcVideoFile?: File | null;
}

export async function saveFacilityOutsourceDetails({
  data,
  dcPhotoFile,
  dcVideoFile,
}: SaveFacilityOutsourceDetailsParams): Promise<unknown> {
  const files: Record<string, File> = {};
  if (dcPhotoFile) files.dcPhoto = dcPhotoFile;
  if (dcVideoFile) files.dcVideo = dcVideoFile;

  return apiPostEncryptedMultipartSession(SAVE_FACILITY_OUTSOURCE_DETAILS_ENDPOINT, data, files);
}
