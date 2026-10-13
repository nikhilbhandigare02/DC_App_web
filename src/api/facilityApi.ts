/** Ported from `lib/repository/facility_repository.dart`. */

import { apiPostEncryptedMultipartSession, apiPostEncryptedSession } from '../lib/apiClient';

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

export const SAVE_TIMING_DETAILS_ENDPOINT = 'api/Empanelment/SaveTimingDetails';
export const SAVE_FACILITY_DETAILS_ENDPOINT = 'api/Empanelment/SaveFacilityDetails';

export interface TimingDetail {
  empanelmentMastId: number;
  /** The day's id from `GetDay` (int on the backend), not its name. */
  dayId: number;
  /** Yes/No id (from `GetYesNo`) of the day's working checkbox. */
  workingType: number;
  /** `HH:mm` */
  workingStartTime: string;
  /** `HH:mm` */
  workingEndTime: string;
}

/**
 * Saves every day's timing in one call. The backend deserializes
 * `{ Details: [...] }` (`SaveTimingDetailsArray`) — a bare object arrives as null.
 * `inserted_by` is taken from the session.
 */
export function saveTimingDetails(details: TimingDetail[]): Promise<unknown> {
  return apiPostEncryptedSession(SAVE_TIMING_DETAILS_ENDPOINT, {
    Details: details.map((d) => ({
      EmpanelmentMastId: d.empanelmentMastId,
      DayName: d.dayId,
      WorkingType: d.workingType,
      WorkingStartTime: d.workingStartTime,
      WorkingEndTime: d.workingEndTime,
    })),
  });
}

export interface SaveFacilityDetailsParams {
  empanelmentMastId: number;
  /** 0 inserts a new facility; an existing id updates it. */
  facilityDetailsId?: number;
  /** Facility type id (int on the backend). */
  facilityName: number;
  /** DDL id from `GetSourceType`. */
  sourceType: number;
  /** DDL id from `GetVisitType`. */
  visitType: number;
  sourceName: string;
  sourceAddress: string;
  /** `HH:mm` */
  facilityTimeFrom: string;
  /** `HH:mm` */
  facilityTimeTo: string;
  /** String on the backend; no UI input yet so defaults to "0". */
  weightCapacity?: string;
}

/** Saves a facility's common details (every facility type). Wrapped as `{ Details: [...] }` (`SaveFacilityDetailsArray`). */
export function saveFacilityDetails(params: SaveFacilityDetailsParams): Promise<unknown> {
  return apiPostEncryptedSession(SAVE_FACILITY_DETAILS_ENDPOINT, {
    Details: [
      {
        EmpanelmentMastId: params.empanelmentMastId,
        FacilityDetailsId: params.facilityDetailsId ?? 0,
        FacilityName: params.facilityName,
        SourceType: params.sourceType,
        VisitType: params.visitType,
        SourceName: params.sourceName,
        SourceAddress: params.sourceAddress,
        FacilityTimeFrom: params.facilityTimeFrom,
        FacilityTimeTo: params.facilityTimeTo,
        WeightCapacity: params.weightCapacity ?? '0',
      },
    ],
  });
}

export const SAVE_HOME_VISIT_DETAILS_ENDPOINT = 'api/Empanelment/SaveHomeVisitDetailsNew';

export interface SaveHomeVisitDetailsParams {
  empanelmentMastId: number;
  /** Yes/No ids from `GetYesNo`. */
  isHomevisitDc: number;
  isParkingAvailable: number;
  isMultispecialityDc: number;
  technicianCapabilityToTravel: string;
}

/** Saves the Additional tab. The backend model (`SaveHomeVisitDetailsNewDO`) is a single object, not a `Details` array. */
export function saveHomeVisitDetails(params: SaveHomeVisitDetailsParams): Promise<unknown> {
  return apiPostEncryptedSession(SAVE_HOME_VISIT_DETAILS_ENDPOINT, {
    EmpanelmentMastId: params.empanelmentMastId,
    IsHomevisitDc: params.isHomevisitDc,
    // The "done by" choice is not asked; the procedure needs at least one id, so 0 is sent.
    HomevisitDoneBy: [0],
    TechnicianCapabilityToTravel: params.technicianCapabilityToTravel,
    IsParkingAvailable: params.isParkingAvailable,
    IsMultispecialityDc: params.isMultispecialityDc,
  });
}

export const DELETE_FACILITY_DETAILS_ENDPOINT = 'api/Empanelment/DeleteFacilityDetails';

/**
 * Removes (soft deletes) a saved facility. The backend writes a history row and an approval row
 * (status 33, "Remove facility Request").
 */
export function deleteFacilityDetails(params: { empanelmentMastId: number; facilityDetailsId: number }): Promise<unknown> {
  return apiPostEncryptedSession(DELETE_FACILITY_DETAILS_ENDPOINT, params);
}
