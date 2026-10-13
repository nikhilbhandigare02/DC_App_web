/**
 * "Facility Configuration" section shell — three sub-tabs (DC Timing /
 * Additional / Facilities), ported from `FacilityConfigurationCard` in
 * `lib/screens/facility/widgets/facility_sections.dart`.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../../../components/ui/Panel';
import { IconBuilding } from '../../../components/icons';
import { Button } from '../../../components/ui/Button';
import { AdditionalSubTab, type AdditionalAnswers } from './AdditionalSubTab';
import { DcTimingSubTab } from './DcTimingSubTab';
import { FacilitiesSubTab } from './FacilitiesSubTab';
import { Tabs } from './Tabs';
import { toast } from '../../../lib/toast';
import type { DdlOptionModel } from '../../../types/ddl';
import type { DayTimingData, FacilityEntryData } from '../../../types/facility';
import { additionalError, dcTimingError, facilityError, saveFacilityConfiguration } from '../saveFacilityConfiguration';
import { getFacilityConfig, getFacilityConfigs } from '../facilityConfigStore';

const SUB_TABS = [{ label: 'DC Timing' }, { label: 'Additional' }, { label: 'Facilities' }];

export function FacilityConfigurationTab({ initialSubTab = 0, editId }: { initialSubTab?: number; editId?: number }) {
  const [subTabIndex, setSubTabIndex] = useState(initialSubTab);
  const navigate = useNavigate();
  /** Update flow: the facility whose values pre-fill the three forms. */
  const editing = editId != null ? getFacilityConfig(editId) : undefined;
  /** What was entered on earlier steps — kept because each sub-tab remounts when you switch. */
  const [timingsDraft, setTimingsDraft] = useState<DayTimingData[] | undefined>(undefined);
  const [answersDraft, setAnswersDraft] = useState<AdditionalAnswers | undefined>(undefined);
  /** True while "Save & Close" is sending the save APIs. */
  const [saving, setSaving] = useState(false);

  /**
   * "Save & Close": checks the three tabs (jumping to the first one that is not ready) and then sends every
   * save API — DC Timing, Additional, then each facility. Nothing is sent before this.
   */
  async function handleSaveAll(
    facilities: FacilityEntryData[],
    sourceTypeOptions: DdlOptionModel[],
    visitTypeOptions: DdlOptionModel[],
    addingToSaved: boolean,
  ) {
    if (saving) return;
    // DC Timing and Additional belong to the whole empanelment. When facilities are only being ADDED to an
    // empanelment whose timing / Additional are already saved, they are left alone: re-sending them would be recorded
    // as an update (status 32) of the existing record.
    const saved = getFacilityConfigs();
    const skipTiming = addingToSaved && saved.some((i) => i.timingSaved);
    const skipAnswers = addingToSaved && saved.some((i) => i.additionalSaved);
    if (!skipTiming && !timingsDraft) {
      toast.error('Please complete the DC Timing tab (Save & Next) first.');
      setSubTabIndex(0);
      return;
    }
    const timingError = skipTiming ? null : dcTimingError(timingsDraft!);
    if (timingError) {
      toast.error(timingError);
      setSubTabIndex(0);
      return;
    }
    if (!skipAnswers && !answersDraft) {
      toast.error('Please complete the Additional tab (Save & Next) first.');
      setSubTabIndex(1);
      return;
    }
    const answersError = skipAnswers ? null : additionalError(answersDraft!);
    if (answersError) {
      toast.error(answersError);
      setSubTabIndex(1);
      return;
    }
    for (const facility of facilities) {
      const error = facilityError(facility);
      if (error) {
        toast.error(error);
        return;
      }
    }

    setSaving(true);
    try {
      await saveFacilityConfiguration({
        timings: skipTiming ? undefined : timingsDraft,
        answers: skipAnswers ? undefined : answersDraft,
        facilities,
        sourceTypeOptions,
        visitTypeOptions,
      });
      toast.success('Facility configuration saved successfully');
      // The list reloads from the server when it opens.
      navigate('/home/facility/list');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the facility configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    navigate('/home/facility', { replace: true, state: { topTab: 1 } });
  }

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent-light to-accent text-white shadow-sm shadow-accent/30">
          <IconBuilding size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-text-primary">Facility Configuration</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">Working hours, general details and the facility types you offer.</p>
        </div>
        <Button size="sm" onClick={() => navigate('/home/facility/list')}>
          View facility
        </Button>
      </div>

      {editing && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-primary/25 bg-primary-pale px-3 py-2">
          <p className="text-xs font-medium text-primary">
            Editing {editing.name} — update DC Timing, Additional and Facilities, then click Save & Close.
          </p>
          <Button size="sm" variant="secondary" onClick={cancelEdit}>
            Cancel
          </Button>
        </div>
      )}

      <Tabs items={SUB_TABS} activeIndex={subTabIndex} onChange={setSubTabIndex} className="mb-4" />

      {subTabIndex === 0 && (
        <DcTimingSubTab
          draft={timingsDraft}
          prefillItem={editing}
          onSaved={(timings) => {
            setTimingsDraft(timings);
            setSubTabIndex(1);
          }}
        />
      )}
      {subTabIndex === 1 && (
        <AdditionalSubTab
          prefill={
            answersDraft ??
            (editing
              ? {
                  homeVisit: editing.homeVisit,
                  parking: editing.parking,
                  multispeciality: editing.multispeciality,
                  travel: editing.technicianTravel,
                }
              : undefined)
          }
          prefillTravel={editing?.technicianTravel}
          onSaved={(answers) => {
            setAnswersDraft(answers);
            setSubTabIndex(2);
          }}
        />
      )}
      {subTabIndex === 2 && <FacilitiesSubTab prefillItem={editing} onSaveAll={handleSaveAll} saving={saving} />}
    </Panel>
  );
}
