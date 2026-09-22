import { useId } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  children?: ReactNode;
}

/** Compact labeled `<select>` matching `Input`'s frame. Pass `options`, or `children` for custom `<option>`s. */
export function Select({ label, error, hint, options, placeholder, id, className, children, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={selectId} className="text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <div
        className={`rounded-md border bg-surface transition-all duration-150 ease-out focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(14,165,174,0.15)] ${
          error ? 'border-field-error' : 'border-divider'
        }`}
      >
        <select
          id={selectId}
          className={`h-[34px] w-full bg-transparent px-2.5 text-sm text-text-primary focus:outline-none ${className ?? ''}`}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          ) : null}
          {children ?? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {!error && hint ? (
        <p className="text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
