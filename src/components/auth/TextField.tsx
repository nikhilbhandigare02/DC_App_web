import type { InputHTMLAttributes, ReactNode } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  suffix?: ReactNode;
  error?: string;
}

/**
 * Shared labeled input with a leading icon slot and optional trailing
 * (suffix) slot — ports `lib/widgets/app_text_form_field.dart`'s look for
 * the React auth screens.
 */
export function TextField({ label, icon, suffix, error, id, className, ...inputProps }: TextFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-medium text-text-primary">
        {label}
      </label>
      <div
        className={`flex items-center gap-2.5 rounded-md border bg-surface px-3 py-2.5 transition-all duration-150 ease-out focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(14,165,174,0.15)] ${
          error ? 'border-field-error' : 'border-divider'
        }`}
      >
        {icon ? <span className="shrink-0 text-text-tertiary">{icon}</span> : null}
        <input
          id={inputId}
          className={`min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none ${className ?? ''}`}
          {...inputProps}
        />
        {suffix ? <span className="shrink-0">{suffix}</span> : null}
      </div>
    </div>
  );
}
