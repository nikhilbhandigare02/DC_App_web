import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Rendered right-aligned next to the title — typically a `Button` or small group of them. */
  actions?: ReactNode;
  /** Optional icon/badge rendered to the left of the title. Omit for the plain text-only look. */
  icon?: ReactNode;
  className?: string;
}

/** Consistent title + description + action-slot header used at the top of every `/home/*` screen. */
export function PageHeader({ title, description, actions, icon, className }: PageHeaderProps) {
  return (
    <div className={`animate-fade-in-up mb-5 flex flex-wrap items-start justify-between gap-3 ${className ?? ''}`}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-pale to-accent-pale/60 text-primary shadow-[0_4px_12px_-4px_rgba(18,60,94,0.3)]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          <span className="mt-1.5 block h-[3px] w-10 rounded-full bg-gradient-to-r from-primary via-accent to-gold" />
          {description ? <p className="mt-2 text-sm text-text-secondary">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
