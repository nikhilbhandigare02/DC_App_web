/**
 * "Additional" sub-tab — ported from the Yes/No dropdown group in
 * `lib/screens/facility/widgets/facility_sections.dart` and the
 * `FacilityAdditional*` events in `facility_event.dart`.
 *
 * Like the DC Timing sub-tab, there is no dedicated backend endpoint for
 * these three answers among the provided APIs, so "Save & Next" only
 * validates locally before advancing to the Facilities sub-tab.
 */

import { useEffect, useState } from 'react';
import { getYesNo } from '../../../api/ddlApi';
import { Button } from '../../../components/ui/Button';
import { Panel } from '../../../components/ui/Panel';
import { Select } from '../../../components/ui/Select';
import { IconBadge } from '../../../components/icons';
import { toast } from '../../../lib/toast';
import type { DdlOptionModel } from '../../../types/ddl';

interface AdditionalSubTabProps {
  onSaved: () => void;
}

export function AdditionalSubTab({ onSaved }: AdditionalSubTabProps) {
  const [options, setOptions] = useState<DdlOptionModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [homeVisit, setHomeVisit] = useState('');
  const [parking, setParking] = useState('');
  const [multispeciality, setMultispeciality] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await getYesNo();
        if (!cancelled) setOptions(opts);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Yes/No options are not available right now.';
          toast.error(msg);
          setOptions([
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSave() {
    if (!homeVisit || !parking || !multispeciality) {
      toast.error('Please answer all three questions.');
      return;
    }
    onSaved();
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

      <div className="mt-4 border-t border-divider pt-4">
        <Button onClick={handleSave}>Save &amp; Next</Button>
      </div>
    </Panel>
  );
}
