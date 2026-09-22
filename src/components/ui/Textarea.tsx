import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Compact labeled textarea matching `Input`'s frame. */
export function Textarea({ label, error, hint, id, className, rows = 3, ...rest }: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={textareaId} className="text-[13px] font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full resize-y rounded-md border bg-surface px-2.5 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-150 ease-out focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(14,165,174,0.15)] ${
          error ? 'border-field-error' : 'border-divider'
        } ${className ?? ''}`}
        {...rest}
      />
      {!error && hint ? (
        <p className="text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}
