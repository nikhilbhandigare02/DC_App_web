/**
 * Facility screen — ported from `FacilityScreenWeb` in
 * `lib/screens/facility/facility_screen_web.dart`: a two-tab shell
 * (Facility Doctors / Facility Configuration) mounted at `/home/facility`
 * inside `HomeLayout`'s `<Outlet />`.
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { FacilityConfigurationTab } from './components/FacilityConfigurationTab';
import { FacilityDoctorsTab } from './components/FacilityDoctorsTab';
import { Tabs } from './components/Tabs';

const TOP_TABS = [{ label: 'Facility Doctors' }, { label: 'Facility Configuration' }];

/** Where the Facilities list's Edit buttons send you: which top tab and which Configuration sub-tab to open. */
interface FacilityNavState {
  topTab?: number;
  subTab?: number;
  /** Id of the facility being updated through the three forms. */
  editId?: number;
}

export function FacilityPage() {
  const location = useLocation();
  const navState = (location.state ?? {}) as FacilityNavState;
  const [topTabIndex, setTopTabIndex] = useState(navState.topTab ?? 0);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-6 left-0 right-0 -z-10 h-28 bg-gradient-to-b from-primary-pale/50 via-accent-pale/20 to-transparent" />

      <PageHeader title="Facility" description="Manage empanelled doctors and this diagnostic centre's configuration." />

      <Tabs items={TOP_TABS} activeIndex={topTabIndex} onChange={setTopTabIndex} className="mb-5" />

      {topTabIndex === 0 ? <FacilityDoctorsTab /> : <FacilityConfigurationTab initialSubTab={navState.subTab ?? 0} editId={navState.editId} />}
    </div>
  );
}
