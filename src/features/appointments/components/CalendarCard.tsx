import { useState } from 'react';
import { isSameDay } from '../types';
import { IconCalendar, IconChevronRight } from '../../../components/icons';

interface CalendarCardProps {
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  /** Days that have at least one appointment — used to render a marker dot. */
  hasAppointments: (day: Date) => boolean;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Monday-first day-of-week index (0 = Monday .. 6 = Sunday). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Compact month-grid calendar shown in a narrow side panel next to the
 * appointments table. Collapsible so the table can take the primary visual
 * weight on the page — matches the SaaS-admin density in `Login.tsx`
 * (subtle border, small radius, no heavy shadow) rather than the old
 * mobile full-width card.
 */
export function CalendarCard({ selectedDay, onSelectDay, hasAppointments }: CalendarCardProps) {
  const [focusedMonth, setFocusedMonth] = useState(() => startOfMonth(new Date()));
  const [collapsed, setCollapsed] = useState(false);

  const monthStart = startOfMonth(focusedMonth);
  const leadingBlanks = mondayIndex(monthStart);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  function goToMonth(offset: number) {
    setFocusedMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() + offset, 1));
  }

  function handleDayClick(day: Date) {
    onSelectDay(isSameDay(selectedDay, day) ? null : day);
  }

  return (
    <div className="rounded-lg border border-divider bg-surface">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-appointment-accent to-appointment-accent/70 text-white shadow-[0_2px_5px_-1px_rgba(108,92,231,0.5)]">
          <IconCalendar size={13} />
        </span>
        <span className="flex-1 text-left text-[13px] font-semibold text-text-primary">Calendar</span>
        {selectedDay && !collapsed && (
          <span className="rounded-full bg-appointment-pale px-2 py-0.5 text-[10px] font-semibold text-appointment-accent">
            1 selected
          </span>
        )}
        <IconChevronRight
          size={14}
          className={`shrink-0 text-text-tertiary transition-transform ${collapsed ? '' : 'rotate-90'}`}
        />
      </button>

      {!collapsed && (
        <div className="border-t border-divider px-3 pb-3 pt-2.5">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              aria-label="Previous month"
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-surface-variant"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="text-[12.5px] font-semibold text-text-primary">
              {monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              aria-label="Next month"
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary hover:bg-surface-variant"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 pb-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="text-[10px] font-semibold text-text-tertiary">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const selected = isSameDay(selectedDay, day);
              const today = isToday(day);
              const marked = hasAppointments(day);
              const weekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={[
                    'relative flex h-7 w-7 items-center justify-center rounded-md text-[11.5px] font-medium transition-all duration-150',
                    selected
                      ? 'bg-gradient-to-b from-appointment-accent to-appointment-accent/80 text-white font-semibold shadow-[0_2px_6px_-1px_rgba(108,92,231,0.55)]'
                      : today
                        ? 'border border-appointment-accent/40 bg-appointment-pale text-appointment-accent font-semibold'
                        : weekend
                          ? 'text-error hover:bg-surface-variant'
                          : 'text-text-primary hover:bg-surface-variant',
                  ].join(' ')}
                >
                  {day.getDate()}
                  {marked && !selected && (
                    <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-appointment-accent shadow-[0_0_4px_rgba(108,92,231,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <button
              type="button"
              onClick={() => onSelectDay(null)}
              className="mt-2 w-full rounded-md border border-divider py-1.5 text-[11.5px] font-medium text-text-secondary hover:bg-surface-variant"
            >
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
