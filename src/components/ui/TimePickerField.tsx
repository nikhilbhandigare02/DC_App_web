/**
 * Scrollable hour/minute/AM-PM spinner — the web port of
 * `AppTimePickerField` (`lib/widgets/app_time_picker_field.dart`), which
 * opens a `CupertinoDatePicker` wheel instead of a native time-input
 * control. Replaces the plain `<input type="time">` used on the Facility
 * screen's DC Timing and Facilities sub-tabs.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconClock } from '../icons';
import { Button } from './Button';
import { Modal } from './Modal';

export interface TimeOfDayValue {
  /** 24-hour, 0-23. */
  hour: number;
  minute: number;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const PAD_ROWS = (VISIBLE_ROWS - 1) / 2;

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['AM', 'PM'] as const;
type Period = (typeof PERIODS)[number];

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function to12Hour(hour24: number): { hour12: number; period: Period } {
  const period: Period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: Period): number {
  const base = hour12 % 12;
  return period === 'PM' ? base + 12 : base;
}

interface WheelColumnProps<T> {
  items: readonly T[];
  index: number;
  onSettle: (index: number) => void;
  formatItem: (item: T) => string;
}

/** One scroll-snapping wheel column — settles on the nearest item ~120ms after scrolling stops. */
function WheelColumn<T>({ items, index, onSettle, formatItem }: WheelColumnProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | undefined>(undefined);

  // Jump to the initial value once, without triggering the scroll handler's settle logic.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = index * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll() {
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const nextIndex = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
      el.scrollTo({ top: nextIndex * ITEM_HEIGHT, behavior: 'smooth' });
      onSettle(nextIndex);
    }, 120);
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="h-full flex-1 snap-y snap-mandatory overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div style={{ height: ITEM_HEIGHT * PAD_ROWS }} />
      {items.map((item, i) => (
        <div
          key={i}
          className="flex snap-center items-center justify-center text-[15px] font-semibold text-text-primary"
          style={{ height: ITEM_HEIGHT }}
        >
          {formatItem(item)}
        </div>
      ))}
      <div style={{ height: ITEM_HEIGHT * PAD_ROWS }} />
    </div>
  );
}

export interface TimePickerFieldProps {
  value: TimeOfDayValue;
  onChange: (time: TimeOfDayValue) => void;
  disabled?: boolean;
  className?: string;
  /** Optional label above the trigger button, matching `Input`'s label style. */
  label?: string;
}

export function TimePickerField({ value, onChange, disabled, className, label }: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [hourIndex, setHourIndex] = useState(0);
  const [minuteIndex, setMinuteIndex] = useState(0);
  const [periodIndex, setPeriodIndex] = useState(0);

  const displayed = to12Hour(value.hour);

  function openPicker() {
    if (disabled) return;
    const current = to12Hour(value.hour);
    setHourIndex(current.hour12 - 1);
    setMinuteIndex(value.minute);
    setPeriodIndex(current.period === 'AM' ? 0 : 1);
    setOpen(true);
  }

  function handleDone() {
    onChange({
      hour: to24Hour(HOURS_12[hourIndex], PERIODS[periodIndex]),
      minute: MINUTES[minuteIndex],
    });
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label ? <span className="text-[13px] font-medium text-text-primary">{label}</span> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={`flex items-center gap-1.5 rounded-md border border-divider bg-surface px-2 py-1.5 text-sm text-text-primary disabled:bg-surface-variant disabled:text-text-tertiary ${className ?? ''}`}
      >
        <span>{`${pad2(displayed.hour12)}:${pad2(value.minute)} ${displayed.period}`}</span>
        <IconClock size={14} className="text-text-secondary" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Select Time"
        width={300}
        footer={
          (
            <>
              <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDone}>
                Done
              </Button>
            </>
          ) as ReactNode
        }
      >
        <div className="relative flex select-none" style={{ height: ITEM_HEIGHT * VISIBLE_ROWS }}>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-md border-y border-primary/30 bg-primary-pale/40" />
          <WheelColumn items={HOURS_12} index={hourIndex} onSettle={setHourIndex} formatItem={(h) => pad2(h)} />
          <div className="flex w-4 items-center justify-center text-base font-bold text-text-tertiary">:</div>
          <WheelColumn items={MINUTES} index={minuteIndex} onSettle={setMinuteIndex} formatItem={(m) => pad2(m)} />
          <WheelColumn items={PERIODS} index={periodIndex} onSettle={setPeriodIndex} formatItem={(p) => p} />
        </div>
      </Modal>
    </div>
  );
}
