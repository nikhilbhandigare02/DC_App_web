import type { ReactNode } from 'react';

export type StatTrend = 'up' | 'down' | 'neutral';
export type StatTileAccent = 'primary' | 'accent' | 'gold';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Optional trend line, e.g. "+12% vs last month". */
  trend?: string;
  trendDirection?: StatTrend;
  /** Icon badge color. Defaults to `primary`. */
  accent?: StatTileAccent;
  className?: string;
}

const TREND_CLASSES: Record<StatTrend, string> = {
  up: 'text-success',
  down: 'text-error',
  neutral: 'text-text-tertiary',
};

const ACCENT_CLASSES: Record<StatTileAccent, string> = {
  primary: 'bg-gradient-to-br from-primary-pale to-primary-pale/40 text-primary shadow-[0_4px_12px_-4px_rgba(18,60,94,0.35)]',
  accent: 'bg-gradient-to-br from-accent-pale to-accent-pale/40 text-accent-dark shadow-[0_4px_12px_-4px_rgba(14,165,174,0.35)]',
  gold: 'bg-gradient-to-br from-gold-pale to-gold-pale/40 text-gold shadow-[0_4px_12px_-4px_rgba(201,154,61,0.35)]',
};

/** Small KPI tile for dashboard summary rows: label, big value, optional icon + trend line. */
export function StatTile({
  label,
  value,
  icon,
  trend,
  trendDirection = 'neutral',
  accent = 'primary',
  className,
}: StatTileProps) {
  return (
    <div
      className={`animate-fade-in-up rounded-lg border border-divider bg-surface p-4 transition-shadow duration-200 hover:shadow-sm ${className ?? ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-text-secondary">{label}</p>
        {icon ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${ACCENT_CLASSES[accent]}`}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
      {trend ? <p className={`mt-1 text-xs font-medium ${TREND_CLASSES[trendDirection]}`}>{trend}</p> : null}
    </div>
  );
}
