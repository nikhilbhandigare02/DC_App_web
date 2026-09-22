import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

/** Compact checkbox with an inline label. */
export function Checkbox({ label, error, id, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const checkboxId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={checkboxId} className="inline-flex cursor-pointer items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          className={`h-4 w-4 shrink-0 rounded border-divider text-primary accent-primary transition-transform duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-90 ${className ?? ''}`}
          {...rest}
        />
        {label ? <span className="text-sm text-text-primary">{label}</span> : null}
      </label>
      {error ? <p className="text-xs font-medium text-field-error">{error}</p> : null}
    </div>
  );
}
