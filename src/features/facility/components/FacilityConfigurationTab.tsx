/**
 * "Facility Configuration" section shell — three sub-tabs (DC Timing /
 * Additional / Facilities), ported from `FacilityConfigurationCard` in
 * `lib/screens/facility/widgets/facility_sections.dart`.
 */

import { useState } from 'react';
import { Panel } from '../../../components/ui/Panel';
import { IconBuilding } from '../../../components/icons';
import { AdditionalSubTab } from './AdditionalSubTab';
import { DcTimingSubTab } from './DcTimingSubTab';
import { FacilitiesSubTab } from './FacilitiesSubTab';
import { Tabs } from './Tabs';

const SUB_TABS = [{ label: 'DC Timing' }, { label: 'Additional' }, { label: 'Facilities' }];

export function FacilityConfigurationTab() {
  const [subTabIndex, setSubTabIndex] = useState(0);

  return (
    <Panel>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent-light to-accent text-white shadow-sm shadow-accent/30">
          <IconBuilding size={18} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-text-primary">Facility Configuration</h2>
          <p className="mt-0.5 text-xs text-text-tertiary">Working hours, general details and the facility types you offer.</p>
        </div>
      </div>

      <Tabs items={SUB_TABS} activeIndex={subTabIndex} onChange={setSubTabIndex} className="mb-4" />

      {subTabIndex === 0 && <DcTimingSubTab onSaved={() => setSubTabIndex(1)} />}
      {subTabIndex === 1 && <AdditionalSubTab onSaved={() => setSubTabIndex(2)} />}
      {subTabIndex === 2 && <FacilitiesSubTab />}
    </Panel>
  );
}
