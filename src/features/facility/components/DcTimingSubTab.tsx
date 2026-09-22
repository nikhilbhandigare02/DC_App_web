/**
 * "DC Timing" sub-tab — ported from the day-timing widgets in
 * `lib/screens/facility/widgets/facility_sections.dart` and the
 * `FacilityDayWorkingToggled`/`FacilityDayStartTimeChanged`/
 * `FacilityDayEndTimeChanged`/`FacilityDayTimingsCopiedToAll`/
 * `FacilityDayBothTimesAppliedToAll`/`FacilityDcTimingSaveRequested` events
 * in `facility_event.dart`.
 *
 * There is no dedicated "save DC timing" backend endpoint among the
 * provided APIs — mirroring the Dart bloc (which only validates locally
 * before advancing to the next config sub-tab), "Save" here validates and
 * advances to the Additional sub-tab rather than calling a network request.
 *
 * Rendered as a compact 7-row grid (day | working | start | end | actions)
 * rather than a stacked mobile list.
 */

import { useEffect, useState } from 'react';
import { getDay } from '../../../api/ddlApi';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { toast } from '../../../lib/toast';
import type { DayTimingData } from '../../../types/facility';
import { WEEKDAYS, inputValueToTime, timeToInputValue, timeToMinutes } from '../utils';

const DEFAULT_START = { hour: 9, minute: 0 };
const DEFAULT_END = { hour: 18, minute: 0 };

function buildDefaultTimings(days: string[]): DayTimingData[] {
  return days.map((day) => ({
    day,
    isWorking: true,
    startTime: { ...DEFAULT_START },
    endTime: { ...DEFAULT_END },
  }));
}

interface DcTimingSubTabProps {
  onSaved: () => void;
}

export function DcTimingSubTab({ onSaved }: DcTimingSubTabProps) {
  const [loading, setLoading] = useState(true);
  const [timings, setTimings] = useState<DayTimingData[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const days = await getDay();
        const names = days.map((d) => d.name).filter((n): n is string => !!n);
        if (!cancelled) setTimings(buildDefaultTimings(names.length > 0 ? names : WEEKDAYS));
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Days are not available right now.';
          toast.error(msg);
          setTimings(buildDefaultTimings(WEEKDAYS));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDay(day: string, patch: Partial<DayTimingData>) {
    setTimings((prev) => prev.map((t) => (t.day === day ? { ...t, ...patch } : t)));
  }

  function applyBothTimesToAll(sourceDay: string) {
    setTimings((prev) => {
      const source = prev.find((t) => t.day === sourceDay);
      if (!source) return prev;
      return prev.map((t) => ({ ...t, startTime: source.startTime, endTime: source.endTime }));
    });
  }

  function handleSave() {
    const workingDays = timings.filter((t) => t.isWorking);
    if (workingDays.length === 0) {
      toast.error('Mark at least one working day.');
      return;
    }
    const invalidDay = workingDays.find((t) => timeToMinutes(t.endTime) <= timeToMinutes(t.startTime));
    if (invalidDay) {
      toast.error(`${invalidDay.day}: End time must be after start time.`);
      return;
    }
    onSaved();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-divider border-t-primary" />
        Loading days...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-divider">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-divider bg-gradient-to-r from-surface-variant/70 to-primary-pale/20">
              <th className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Day
              </th>
              <th className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Start
              </th>
              <th className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                End
              </th>
              <th className="whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {timings.map((timing) => (
              <tr
                key={timing.day}
                className={`border-b border-l-4 border-divider last:border-b-0 transition-colors duration-200 ${
                  timing.isWorking ? 'border-l-success bg-success-pale/30' : 'border-l-error/50 bg-error-pale/20'
                }`}
              >
                <td className="px-3.5 py-2.5">
                  <Checkbox
                    label={timing.day}
                    checked={timing.isWorking}
                    onChange={(e) => updateDay(timing.day, { isWorking: e.target.checked })}
                  />
                </td>
                <td className="px-3.5 py-2.5">
                  <input
                    type="time"
                    disabled={!timing.isWorking}
                    value={timeToInputValue(timing.startTime)}
                    onChange={(e) => updateDay(timing.day, { startTime: inputValueToTime(e.target.value) })}
                    className="rounded-md border border-divider bg-surface px-2 py-1.5 text-sm text-text-primary disabled:bg-surface-variant disabled:text-text-tertiary"
                  />
                </td>
                <td className="px-3.5 py-2.5">
                  <input
                    type="time"
                    disabled={!timing.isWorking}
                    value={timeToInputValue(timing.endTime)}
                    onChange={(e) => updateDay(timing.day, { endTime: inputValueToTime(e.target.value) })}
                    className="rounded-md border border-divider bg-surface px-2 py-1.5 text-sm text-text-primary disabled:bg-surface-variant disabled:text-text-tertiary"
                  />
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    {/* <button
                      type="button"
                      onClick={() => copyToAll(timing.day)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Copy to all
                    </button> */}
                    <button
                      type="button"
                      onClick={() => applyBothTimesToAll(timing.day)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Apply times to all
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-1">
        <Button onClick={handleSave}>Save &amp; Next</Button>
      </div>
    </div>
  );
}
