import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface OtpInputProps {
  length: number;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}

/**
 * Six individual digit boxes with auto-advance-on-type and
 * backspace-focuses-previous behavior, ported from the `_OtpBox` widgets in
 * `forgot_password_screen_web.dart`.
 */
export function OtpInput({ length, values, onChange, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[index] = digit;
    onChange(next);
    if (digit) {
      setPulseIndex(index);
      if (index < length - 1) {
        refs.current[index + 1]?.focus();
      }
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !values[index] && index > 0) {
      const next = [...values];
      next[index - 1] = '';
      onChange(next);
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={values[index] ?? ''}
          onChange={(e) => setDigit(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          aria-label={`OTP digit ${index + 1}`}
          onAnimationEnd={() => setPulseIndex((cur) => (cur === index ? null : cur))}
          className={`h-12 w-[42px] rounded-md border border-divider bg-surface text-center text-base font-semibold text-text-primary transition-all duration-150 ease-out focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_rgba(14,165,174,0.2)] ${
            pulseIndex === index ? 'animate-digit-pulse' : ''
          }`}
        />
      ))}
    </div>
  );
}
