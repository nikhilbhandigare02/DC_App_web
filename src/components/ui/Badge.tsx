import type { HTMLAttributes } from 'react';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-gradient-to-b from-success-pale to-success-pale/70 text-success border-success/25',
  warning: 'bg-gradient-to-b from-warning-pale to-warning-pale/70 text-warning border-warning/25',
  error: 'bg-gradient-to-b from-error-pale to-error-pale/70 text-error border-error/25',
  info: 'bg-gradient-to-b from-info-pale to-info-pale/70 text-info border-info/25',
  neutral: 'bg-gradient-to-b from-surface-variant to-surface-variant/60 text-text-secondary border-divider',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-text-tertiary',
};

/** Small status pill using the existing semantic color tokens, with a subtle gradient fill and a colored lead dot. */
export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-4 transition-colors duration-200 ${TONE_CLASSES[tone]} ${className ?? ''}`}
      {...rest}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`} />
      {children}
    </span>
  );
}
