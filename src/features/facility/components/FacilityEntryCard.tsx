/**
 * Full detail form for a single facility-type entry — rendered as the
 * content of the `Drawer` opened from `FacilitiesSubTab`'s table (was
 * previously an inline accordion; ported from `_FacilityAccordionItem`/
 * `_FacilityDetailForm` in `lib/screens/facility/widgets/facility_sections.dart`).
 *
 * Shows Source Type / Visit Type / time range, and — only when Source Type
 * is "Outsource" — the Contact & Location sub-form (name, address, pincode
 * with auto city/district/state lookup, cascading state->district->city
 * selects, lat/long, and drag-and-drop photo/video upload), saved via
 * `facilityApi.saveFacilityOutsourceDetails`.
 */

import { useEffect, useRef, useState } from 'react';
import { getCityByPincode, getCityName, getDistrictByState, getDistrictName, getStateName, getStates } from '../../../api/ddlApi';
import { saveFacilityOutsourceDetails } from '../../../api/facilityApi';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { IconMapPin } from '../../../components/icons';
import { toast } from '../../../lib/toast';
import type { DdlOptionModel } from '../../../types/ddl';
import type { FacilityEntryData } from '../../../types/facility';
import { resolveEmpanelmentMastId, timeToInputValue, inputValueToTime } from '../utils';

interface FacilityEntryCardProps {
  facility: FacilityEntryData;
  sourceTypeOptions: DdlOptionModel[];
  visitTypeOptions: DdlOptionModel[];
  onRemove: () => void;
  onChange: (patch: Partial<FacilityEntryData>) => void;
  /** Closes the drawer. Used by the Inhouse "Save & Close" action — the outsource
   * path saves to the server instead and stays open to show the result. */
  onClose: () => void;
}

function isOutsourceLabel(value?: string | null): boolean {
  return !!value && value.toLowerCase().includes('outsource');
}

export function FacilityEntryCard({ facility, sourceTypeOptions, visitTypeOptions, onRemove, onChange, onClose }: FacilityEntryCardProps) {
  const outsource = isOutsourceLabel(facility.sourceType);

  const [stateOptions, setStateOptions] = useState<DdlOptionModel[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [districtOptions, setDistrictOptions] = useState<DdlOptionModel[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState<DdlOptionModel[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  const [photoDragOver, setPhotoDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);

  const [saving, setSaving] = useState(false);

  const lastLookedUpPincode = useRef<string | null>(null);

  // Load states once this entry's Source Type is (or becomes) Outsource.
  useEffect(() => {
    if (!outsource || stateOptions.length > 0 || statesLoading) return;
    let cancelled = false;
    setStatesLoading(true);
    getStates()
      .then((options) => {
        if (!cancelled) setStateOptions(options);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setStatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsource]);

  // Cascade: State -> Districts.
  useEffect(() => {
    if (!facility.stateId) {
      setDistrictOptions([]);
      return;
    }
    let cancelled = false;
    setDistrictsLoading(true);
    getDistrictByState(facility.stateId)
      .then((options) => {
        if (!cancelled) setDistrictOptions(options);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facility.stateId]);

  // Cascade: District -> Cities.
  useEffect(() => {
    if (!facility.districtId) {
      setCityOptions([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    getCityName(facility.districtId)
      .then((options) => {
        if (!cancelled) setCityOptions(options);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facility.districtId]);

  // Auto-lookup city/district/state once the pincode reaches 6 digits.
  useEffect(() => {
    const pincode = facility.pincode.trim();
    if (!outsource || pincode.length !== 6 || lastLookedUpPincode.current === pincode) return;

    let cancelled = false;
    lastLookedUpPincode.current = pincode;
    setPincodeStatus('loading');
    setPincodeError(null);

    (async () => {
      try {
        const city = await getCityByPincode(pincode);
        if (cancelled) return;
        if (!city) {
          setPincodeStatus('error');
          setPincodeError('No location found for this pincode.');
          toast.error('No location found for this pincode.');
          return;
        }

        let district: { id: number; name: string; paramId?: number } | null = null;
        let stateItem: { id: number; name: string; paramId?: number } | null = null;
        if (city.paramId != null) {
          try {
            district = await getDistrictName(city.paramId, city.paramId);
            if (district?.paramId != null) {
              stateItem = await getStateName(district.paramId, district.paramId);
            }
          } catch {
            // A partial auto-fill (city only) is still useful.
          }
        }

        if (cancelled) return;
        onChange({
          cityId: city.id,
          cityName: city.name,
          districtId: district?.id ?? null,
          districtName: district?.name ?? null,
          stateId: stateItem?.id ?? null,
          stateName: stateItem?.name ?? null,
        });
        setPincodeStatus('idle');
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not look up this pincode.';
          setPincodeStatus('error');
          setPincodeError(msg);
          toast.error(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility.pincode, outsource]);

  function handleSourceTypeChange(value: string) {
    onChange({ sourceType: value || null });
  }

  function handleSaveInhouseDetails() {
    if (!facility.sourceType || !facility.visitType) {
      toast.error('Please select Source Type and Visit Type before saving.');
      return;
    }
    // Field values are already persisted live via onChange — this just confirms
    // the entry and closes the drawer, matching the outsource save affordance.
    onClose();
  }

  function handlePhotoFile(file: File | null) {
    onChange({ dcPhotoFile: file });
  }
  function handleVideoFile(file: File | null) {
    onChange({ dcVideoFile: file });
  }

  async function handleSaveOutsourceDetails() {
    if (
      !facility.contactPerson.trim() ||
      !facility.fullAddress.trim() ||
      facility.pincode.trim().length !== 6 ||
      !facility.stateId ||
      !facility.districtId ||
      !facility.cityId ||
      !facility.dcPhotoFile
    ) {
      toast.error('Please fill Contact Person, Full Address, a valid Pincode, State, District, City and DC Photo before saving.');
      return;
    }

    setSaving(true);
    try {
      const empanelmentMastId = resolveEmpanelmentMastId();
      const data = {
        EmpanelmentMastId: empanelmentMastId,
        OutsourceDetailId: 0,
        FacilityTypeId: Number(facility.typeCode) || 0,
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
      };

      await saveFacilityOutsourceDetails({
        data,
        dcPhotoFile: facility.dcPhotoFile,
        dcVideoFile: facility.dcVideoFile,
      });

      toast.success('Facility details saved successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save facility details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const sourceTypeSelectOptions = sourceTypeOptions.map((o) => ({ value: o.label, label: o.label }));
  const visitTypeSelectOptions = visitTypeOptions.map((o) => ({ value: o.label, label: o.label }));
  const stateSelectOptions = stateOptions.map((o) => ({ value: o.value, label: o.label }));
  const districtSelectOptions = districtOptions.map((o) => ({ value: o.value, label: o.label }));
  const citySelectOptions = cityOptions.map((o) => ({ value: o.value, label: o.label }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">Configure this facility type's source, visit type and hours.</p>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md bg-error-pale px-2 py-1 text-xs font-semibold text-error hover:bg-error/10"
        >
          Remove facility type
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Source Type"
          value={facility.sourceType ?? ''}
          onChange={(e) => handleSourceTypeChange(e.target.value)}
          options={sourceTypeSelectOptions}
          placeholder="Select"
        />
        <Select
          label="Visit Type"
          value={facility.visitType ?? ''}
          onChange={(e) => onChange({ visitType: e.target.value || null })}
          options={visitTypeSelectOptions}
          placeholder="Select"
        />
      </div>

      <Input label="Source Name" value={facility.sourceName} onChange={(e) => onChange({ sourceName: e.target.value })} placeholder="Source Name" />
      <Input
        label="Source Address"
        value={facility.sourceAddress}
        onChange={(e) => onChange({ sourceAddress: e.target.value })}
        placeholder="Source Address"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Facility Time From"
          type="time"
          value={timeToInputValue(facility.timeFrom)}
          onChange={(e) => onChange({ timeFrom: inputValueToTime(e.target.value) })}
        />
        <Input
          label="Facility Time To"
          type="time"
          value={timeToInputValue(facility.timeTo)}
          onChange={(e) => onChange({ timeTo: inputValueToTime(e.target.value) })}
        />
      </div>

      {outsource && (
        <div className="space-y-3.5 rounded-lg border border-l-4 border-divider border-l-accent bg-gradient-to-br from-accent-pale/25 to-surface-variant/40 p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-br from-accent-light to-accent text-white shadow-sm shadow-accent/30">
              <IconMapPin size={13} />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Contact &amp; Location</p>
          </div>

          <Input
            label="Contact Person"
            required
            value={facility.contactPerson}
            onChange={(e) => onChange({ contactPerson: e.target.value })}
            placeholder="Full name"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Number"
              value={facility.contactNumber}
              onChange={(e) => onChange({ contactNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="10-digit number"
              inputMode="numeric"
            />
            <Input
              label="Distance (km)"
              value={facility.distanceKm}
              onChange={(e) => onChange({ distanceKm: e.target.value })}
              placeholder="e.g. 4.5"
              inputMode="decimal"
            />
          </div>

          <Input
            label="Full Address"
            required
            value={facility.fullAddress}
            onChange={(e) => onChange({ fullAddress: e.target.value })}
            placeholder="House/street, area, landmark"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Pincode"
              required
              value={facility.pincode}
              onChange={(e) => onChange({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
              placeholder="6-digit pincode"
              inputMode="numeric"
              error={pincodeStatus === 'error' ? (pincodeError ?? undefined) : undefined}
              hint={pincodeStatus === 'loading' ? 'Looking up location...' : undefined}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Latitude"
                value={facility.latitude}
                onChange={(e) => onChange({ latitude: e.target.value })}
                placeholder="19.0760"
              />
              <Input
                label="Longitude"
                value={facility.longitude}
                onChange={(e) => onChange({ longitude: e.target.value })}
                placeholder="72.8777"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Select
              label="State Name"
              required
              value={facility.stateId ?? ''}
              onChange={(e) => {
                const option = stateOptions.find((o) => o.value === e.target.value);
                onChange({
                  stateId: e.target.value ? Number(e.target.value) : null,
                  stateName: option?.label ?? null,
                  districtId: null,
                  districtName: null,
                  cityId: null,
                  cityName: null,
                });
              }}
              options={stateSelectOptions}
              placeholder={statesLoading ? 'Loading...' : 'Select'}
            >
              {facility.stateId && !stateOptions.some((o) => Number(o.value) === facility.stateId) && (
                <option value={facility.stateId}>{facility.stateName}</option>
              )}
              {stateOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              label="District Name"
              required
              value={facility.districtId ?? ''}
              disabled={!facility.stateId}
              onChange={(e) => {
                const option = districtOptions.find((o) => o.value === e.target.value);
                onChange({
                  districtId: e.target.value ? Number(e.target.value) : null,
                  districtName: option?.label ?? null,
                  cityId: null,
                  cityName: null,
                });
              }}
              options={districtSelectOptions}
              placeholder={districtsLoading ? 'Loading...' : 'Select'}
            >
              {facility.districtId && !districtOptions.some((o) => Number(o.value) === facility.districtId) && (
                <option value={facility.districtId}>{facility.districtName}</option>
              )}
              {districtOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              label="City Name"
              required
              value={facility.cityId ?? ''}
              disabled={!facility.districtId}
              onChange={(e) => {
                const option = cityOptions.find((o) => o.value === e.target.value);
                onChange({
                  cityId: e.target.value ? Number(e.target.value) : null,
                  cityName: option?.label ?? null,
                });
              }}
              options={citySelectOptions}
              placeholder={citiesLoading ? 'Loading...' : 'Select'}
            >
              {facility.cityId && !cityOptions.some((o) => Number(o.value) === facility.cityId) && (
                <option value={facility.cityId}>{facility.cityName}</option>
              )}
              {cityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <DropZoneField
              label="DC Photo"
              required
              accept="image/*"
              file={facility.dcPhotoFile ?? null}
              dragOver={photoDragOver}
              onDragOver={setPhotoDragOver}
              onFile={handlePhotoFile}
            />
            <DropZoneField
              label="DC Video"
              accept="video/*"
              file={facility.dcVideoFile ?? null}
              dragOver={videoDragOver}
              onDragOver={setVideoDragOver}
              onFile={handleVideoFile}
            />
          </div>
        </div>
      )}

      {outsource ? (
        <div className="sticky  -mx-5 -mb-4 mt-5 flex items-center justify-end border-t border-divider bg-gradient-to-r from-surface to-accent-pale/20 px-5 py-3.5">
          <Button onClick={handleSaveOutsourceDetails} isLoading={saving}>
            Save details
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-5 -mb-4 mt-5 flex items-center justify-end border-t border-divider bg-gradient-to-r from-surface to-primary-pale/20 px-5 py-3.5">
          <Button onClick={handleSaveInhouseDetails}>Save &amp; Close</Button>
        </div>
      )}
    </div>
  );
}

interface DropZoneFieldProps {
  label: string;
  required?: boolean;
  accept: string;
  file: File | null;
  dragOver: boolean;
  onDragOver: (value: boolean) => void;
  onFile: (file: File | null) => void;
}

function DropZoneField({ label, required, accept, file, dragOver, onDragOver, onFile }: DropZoneFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-text-primary">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </label>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(true);
        }}
        onDragLeave={() => onDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-4 text-center transition-all duration-200 ${
          dragOver
            ? 'border-accent bg-accent-pale shadow-[0_0_0_3px] shadow-accent/15'
            : file
              ? 'border-primary/40 bg-primary-pale/40'
              : 'border-divider bg-surface hover:border-accent/50 hover:bg-accent-pale/20'
        }`}
      >
        <input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <span className="text-[13px] font-medium text-text-primary">
          {file ? file.name : `Drag & drop or click to upload ${label.toLowerCase()}`}
        </span>
        {file && <span className="mt-1 text-xs font-semibold text-primary">Click to replace</span>}
      </label>
    </div>
  );
}
