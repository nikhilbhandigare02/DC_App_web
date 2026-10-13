/**
 * "Additional" sub-tab — ported from the Yes/No dropdown group in
 * `lib/screens/facility/widgets/facility_sections.dart` and the
 * `FacilityAdditional*` events in `facility_event.dart`.
 *
 * "Save & Next" only validates and advances to the Facilities sub-tab; the answers are sent later, by the
 * Facilities tab's "Save & Close" (see `saveFacilityConfiguration`). When "Is this Homevisit DC?" is Yes it also asks
 * for the technician travel range.
 */

import { useEffect, useState } from 'react';
import { getYesNo } from '../../../api/ddlApi';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Panel } from '../../../components/ui/Panel';
import { Select } from '../../../components/ui/Select';
import { IconBadge } from '../../../components/icons';
import { toast } from '../../../lib/toast';
import type { DdlOptionModel } from '../../../types/ddl';
import { additionalError } from '../saveFacilityConfiguration';

/** The three Yes/No answers as booleans, plus the technician travel text (asked when Home Visit is Yes). */
export interface AdditionalAnswers {
  homeVisit: boolean;
  parking: boolean;
  multispeciality: boolean;
  travel: string;
}

interface AdditionalSubTabProps {
  onSaved: (answers: AdditionalAnswers) => void;
  /** Update flow: answers to pre-select (from an earlier step or the facility being edited). */
  prefill?: AdditionalAnswers;
  /** Update flow: the travel text to pre-fill. */
  prefillTravel?: string;
}

export function AdditionalSubTab({ onSaved, prefill, prefillTravel }: AdditionalSubTabProps) {
  const [options, setOptions] = useState<DdlOptionModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [homeVisit, setHomeVisit] = useState('');
  const [parking, setParking] = useState('');
  const [multispeciality, setMultispeciality] = useState('');

  const [travel, setTravel] = useState(prefill?.travel ?? prefillTravel ?? '');

  /** Update flow: pick the option whose label matches each answer. */
  function preselect(opts: DdlOptionModel[]) {
    if (!prefill) return;
    const valueFor = (yes: boolean) => opts.find((o) => o.label.trim().toLowerCase() === (yes ? 'yes' : 'no'))?.value ?? '';
    setHomeVisit(valueFor(prefill.homeVisit));
    setParking(valueFor(prefill.parking));
    setMultispeciality(valueFor(prefill.multispeciality));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getYesNo();
        if (!cancelled) {
          setOptions(opts);
          preselect(opts);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Yes/No options are not available right now.';
          toast.error(msg);
          const fallback = [
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' },
          ];
          setOptions(fallback);
          preselect(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isYes = (value: string) => options.find((o) => o.value === value)?.label.trim().toLowerCase() === 'yes';
  const isHomeVisit = isYes(homeVisit);

  /** Validates and moves on; nothing is sent here. */
  function handleSave() {
    if (!homeVisit || !parking || !multispeciality) {
      toast.error('Please answer all three questions.');
      return;
    }
    const answers: AdditionalAnswers = {
      homeVisit: isYes(homeVisit),
      parking: isYes(parking),
      multispeciality: isYes(multispeciality),
      travel: travel.trim(),
    };
    const error = additionalError(answers);
    if (error) {
      toast.error(error);
      return;
    }
    onSaved(answers);
  }

  const selectOptions = options.map((o) => ({ value: o.value, label: o.label }));

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-divider border-t-primary" />
        Loading options...
      </div>
    );
  }

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-gold to-gold/70 text-white shadow-sm shadow-gold/30">
          <IconBadge size={16} />
        </span>
        <p className="text-xs text-text-tertiary">A few more details that help patients find and choose this centre.</p>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Is this Homevisit DC?"
          placeholder="Select"
          options={selectOptions}
          value={homeVisit}
          onChange={(e) => setHomeVisit(e.target.value)}
          required
        />

        <Select
          label="Is Parking Available?"
          placeholder="Select"
          options={selectOptions}
          value={parking}
          onChange={(e) => setParking(e.target.value)}
          required
        />

        <Select
          label="Multispeciality DC?"
          placeholder="Select"
          options={selectOptions}
          value={multispeciality}
          onChange={(e) => setMultispeciality(e.target.value)}
          required
        />
      </div>

      {isHomeVisit && (
        <div className="mt-4">
          <div className="max-w-xs">
            <Input
              label="Technician capability to travel (km)"
              required
              value={travel}
              onChange={(e) => setTravel(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="e.g. 20"
            />
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-divider pt-4">
        <Button onClick={handleSave}>Save &amp; Next</Button>
      </div>
    </Panel>
  );
}
