import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Removes the default padding, for cards that host their own layout (e.g. a `Table`). */
  noPadding?: boolean;
  /**
   * Marks the card as a clickable/interactive tile (e.g. a dashboard
   * quick-link) — adds a subtle hover lift + colored glow shadow. Leave
   * `false` (the default) for cards that are just static content
   * containers, where a hover lift would look out of place.
   */
  interactive?: boolean;
  /**
   * Adds a thin gradient accent strip along the top edge, for a card that
   * represents a distinct page "section" rather than a plain content box.
   * Defaults to `false` — most cards should stay flat.
   */
  accentTop?: boolean;
}

/**
 * Plain bordered content panel — the SaaS-admin replacement for the old
 * rounded/heavy-shadow mobile card. Subtle 1px border, 8px radius, no
 * drop shadow by default. `Panel` is an alias of the same component; use
 * whichever name reads better at the call site.
 */
export function Card({ children, noPadding = false, interactive = false, accentTop = false, className, ...rest }: CardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-divider bg-surface transition-all duration-200 ease-out ${
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_24px_-12px_rgba(18,60,94,0.35),0_0_0_1px_rgba(14,165,174,0.08)]'
          : ''
      } ${noPadding ? '' : 'p-4'} ${className ?? ''}`}
      {...rest}
    >
      {accentTop ? (
        <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-accent to-gold" />
      ) : null}
      {children}
    </div>
  );
}

/** Alias of `Card` — use for a page section wrapper when "panel" reads better than "card". */
export const Panel = Card;
