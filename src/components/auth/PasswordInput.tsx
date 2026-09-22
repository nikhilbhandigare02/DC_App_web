import { useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { TextField } from './TextField';
import { EyeIcon, EyeOffIcon, LockIcon } from './icons';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  label: string;
  error?: string;
}

/** Password field with a show/hide toggle, reused across every auth form. */
export function PasswordInput({ label, error, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <TextField
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      icon={<LockIcon />}
      error={error}
      autoComplete={inputProps.autoComplete ?? 'current-password'}
      suffix={
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="flex items-center text-text-secondary hover:text-text-primary"
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      {...inputProps}
    />
  );
}
