import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

/** Compact labeled text input for the SaaS-admin UI kit (dashboard/table forms, not the auth flow). */
export function Input({ label, error, hint, icon, suffix, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <div
        className={`flex items-center gap-2 rounded-md border bg-surface px-2.5 py-2 transition-all duration-150 ease-out focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(14,165,174,0.15)] ${
          error ? 'border-field-error' : 'border-divider'
        }`}
      >
        {icon ? <span className="shrink-0 text-text-tertiary">{icon}</span> : null}
        <input
          id={inputId}
          className={`min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none ${className ?? ''}`}
          {...rest}
        />
        {suffix ? <span className="shrink-0">{suffix}</span> : null}
      </div>
      {!error && hint ? (
        <p className="text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
