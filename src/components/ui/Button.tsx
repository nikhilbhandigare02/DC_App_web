import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Optional leading icon (rendered before children, hidden while loading). */
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-primary-light to-primary text-white border border-primary-dark/40 shadow-[0_1px_2px_rgba(10,39,64,0.15),0_4px_10px_-4px_rgba(18,60,94,0.45)] hover:from-primary hover:to-primary-dark hover:shadow-[0_2px_4px_rgba(10,39,64,0.2),0_6px_16px_-4px_rgba(18,60,94,0.5)] disabled:hover:from-primary-light disabled:hover:to-primary disabled:shadow-none',
  secondary:
    'bg-surface text-text-primary border border-divider hover:bg-surface-variant disabled:hover:bg-surface',
  ghost: 'bg-transparent text-text-primary border border-transparent hover:bg-surface-variant',
  danger: 'bg-error text-white border border-error hover:opacity-90 disabled:hover:opacity-100',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-md',
};

/**
 * Shared action button for the SaaS-admin UI kit. Compact by default (md is
 * 36px tall — not the old 48px mobile touch-target size), small-radius
 * corners, subtle borders instead of heavy shadows.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className ?? ''}`}
      {...rest}
    >
      {isLoading ? (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      ) : (
        icon
      )}
      {children ? <span className="truncate">{children}</span> : null}
    </button>
  );
}
