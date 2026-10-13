/**
 * The Facility Configuration screen's save logic — the DC Timing, Additional and Facilities tabs only
 * validate and keep their data in the page; every save API is sent from here, once, by the Facilities
 * tab's "Save & Close" (see `FacilityConfigurationTab.handleSaveAll`).
 */

import { getYesNo } from '../../api/ddlApi';
import {
  saveFacilityDetails,
  saveFacilityOutsourceDetails,
  saveHomeVisitDetails,
  saveTimingDetails,
} from '../../api/facilityApi';
import type { DdlOptionModel } from '../../types/ddl';
import type { DayTimingData, FacilityEntryData } from '../../types/facility';
import type { AdditionalAnswers } from './components/AdditionalSubTab';
import { resolveEmpanelmentMastId, timeToInputValue, timeToMinutes } from './utils';

/** null when the DC Timing is valid, else the message to show. */
export function dcTimingError(timings: DayTimingData[]): string | null {
  const working = timings.filter((t) => t.isWorking);
  if (working.length === 0) return 'Mark at least one working day.';
  const invalid = working.find((t) => timeToMinutes(t.endTime) <= timeToMinutes(t.startTime));
  return invalid ? `${invalid.day}: End time must be after start time.` : null;
}

/** null when the Additional answers are complete, else the message to show. */
export function additionalError(answers: AdditionalAnswers): string | null {
  if (answers.homeVisit && !answers.travel.trim()) return 'Please enter the technician travel capability.';
  return null;
}

/** null when a facility's form is complete, else the message to show. */
export function facilityError(facility: FacilityEntryData): string | null {
  const outsource = !!facility.sourceType && facility.sourceType.toLowerCase().includes('outsource');
  // Source Type and Visit Type are needed for every facility; Source Name and Source Address only describe an
  // outsourced facility's lab.
  const missing = [
    !facility.sourceType && 'Source Type',
    !facility.visitType && 'Visit Type',
    outsource && !facility.sourceName.trim() && 'Source Name',
    outsource && !facility.sourceAddress.trim() && 'Source Address',
  ].filter(Boolean);
  if (missing.length > 0) return `${facility.typeLabel}: please fill ${missing.join(', ')}.`;
  if (
    outsource &&
    (!facility.contactPerson.trim() ||
      !facility.fullAddress.trim() ||
      facility.pincode.trim().length !== 6 ||
      !facility.stateId ||
      !facility.districtId ||
      !facility.cityId ||
      (!facility.dcPhotoFile && !facility.dcPhotoFileName))
  ) {
    return `${facility.typeLabel}: please fill Contact Person, Full Address, a valid Pincode, State, District, City and DC Photo.`;
  }
  return null;
}

/**
 * Sends the DC Timing (`SaveTimingDetails`, which inserts a row per day via `sp_insert_provider_timing_details_dc`).
 * `WorkingType` is the Yes/No id of the day's working checkbox.
 */
async function saveDcTiming(empanelmentMastId: number, timings: DayTimingData[], yesId: number, noId: number) {
  const details = timings.map((t) => {
    if (t.dayId == null) throw new Error(`Could not resolve the id for ${t.day}. Please reload and try again.`);
    return {
      empanelmentMastId,
      dayId: t.dayId,
      workingType: t.isWorking ? yesId : noId,
      workingStartTime: timeToInputValue(t.startTime),
      workingEndTime: timeToInputValue(t.endTime),
    };
  });
  await saveTimingDetails(details);
}

/** Sends the Additional answers (`SaveHomeVisitDetailsNew`). */
async function saveAdditional(empanelmentMastId: number, answers: AdditionalAnswers, yesId: number, noId: number) {
  const id = (value: boolean) => (value ? yesId : noId);
  await saveHomeVisitDetails({
    empanelmentMastId,
    isHomevisitDc: id(answers.homeVisit),
    isParkingAvailable: id(answers.parking),
    isMultispecialityDc: id(answers.multispeciality),
    technicianCapabilityToTravel: answers.homeVisit ? answers.travel.trim() : '',
  });
}

/** Sends one facility (`SaveFacilityDetails`, plus `SaveFacilityOutsourceDetails` for an Outsource one). */
async function saveFacilityEntry(
  empanelmentMastId: number,
  facility: FacilityEntryData,
  sourceTypeOptions: DdlOptionModel[],
  visitTypeOptions: DdlOptionModel[],
) {
  const facilityNameId = Number(facility.typeCode);
  const sourceTypeId = Number(sourceTypeOptions.find((o) => o.label === facility.sourceType)?.value);
  const visitTypeId = Number(visitTypeOptions.find((o) => o.label === facility.visitType)?.value);
  if (!facilityNameId || !sourceTypeId || !visitTypeId) {
    throw new Error(`Could not resolve the facility, source type or visit type id for ${facility.typeLabel}. Please reload and try again.`);
  }

  await saveFacilityDetails({
    empanelmentMastId,
    facilityDetailsId: facility.facilityDetailsId ?? 0,
    facilityName: facilityNameId,
    sourceType: sourceTypeId,
    visitType: visitTypeId,
    sourceName: facility.sourceName.trim(),
    sourceAddress: facility.sourceAddress.trim(),
    facilityTimeFrom: timeToInputValue(facility.timeFrom),
    facilityTimeTo: timeToInputValue(facility.timeTo),
  });

  const outsource = !!facility.sourceType && facility.sourceType.toLowerCase().includes('outsource');
  if (!outsource) return;

  await saveFacilityOutsourceDetails({
    data: {
      EmpanelmentMastId: empanelmentMastId,
      OutsourceDetailId: facility.outsourceDetailId ?? 0,
      FacilityTypeId: facilityNameId,
      ContactPerson: facility.contactPerson.trim(),
      ContactNumber: facility.contactNumber.trim(),
      DistanceKm: Number(facility.distanceKm.trim()) || 0,
      FullAddress: facility.fullAddress.trim(),
      Latitude: Number(facility.latitude.trim()) || 0,
      Longitude: Number(facility.longitude.trim()) || 0,
      City: facility.cityId ?? 0,
      State: facility.stateId ?? 0,
      District: facility.districtId ?? 0,
      Pincode: facility.pincode.trim(),
    },
    dcPhotoFile: facility.dcPhotoFile,
    dcVideoFile: facility.dcVideoFile,
  });
}

export interface SaveFacilityConfigurationParams {
  /** Left out when facilities are only added to an empanelment that already has them saved. */
  timings?: DayTimingData[];
  answers?: AdditionalAnswers;
  facilities: FacilityEntryData[];
  sourceTypeOptions: DdlOptionModel[];
  visitTypeOptions: DdlOptionModel[];
}

/**
 * Sends every save API, in order: DC Timing, Additional, then each facility. The caller validates first
 * (see the `...Error` helpers); this throws an `Error` with the message on the first failure.
 */
export async function saveFacilityConfiguration({
  timings,
  answers,
  facilities,
  sourceTypeOptions,
  visitTypeOptions,
}: SaveFacilityConfigurationParams): Promise<void> {
  const empanelmentMastId = resolveEmpanelmentMastId();

  // The Yes/No ids (GetYesNo) used by both the timing's WorkingType and the Additional answers.
  const yesNo = await getYesNo();
  const yesId = Number(yesNo.find((o) => o.label.trim().toLowerCase() === 'yes')?.value);
  const noId = Number(yesNo.find((o) => o.label.trim().toLowerCase() === 'no')?.value);
  if (!yesId || !noId) throw new Error('Could not resolve the Yes/No ids. Please reload and try again.');

  if (timings) await saveDcTiming(empanelmentMastId, timings, yesId, noId);
  if (answers) await saveAdditional(empanelmentMastId, answers, yesId, noId);
  for (const facility of facilities) {
    await saveFacilityEntry(empanelmentMastId, facility, sourceTypeOptions, visitTypeOptions);
  }
}
