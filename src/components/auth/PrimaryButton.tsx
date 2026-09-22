import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  isLoading?: boolean;
}

/** Ports `lib/widgets/primary_action_button.dart` — the solid CTA button used on every auth screen. */
export function PrimaryButton({ label, icon, isLoading, disabled, className, ...rest }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      className={`flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary-dark/40 bg-gradient-to-b from-primary-light to-primary text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,39,64,0.15),0_4px_12px_-4px_rgba(18,60,94,0.5)] transition-all duration-150 ease-out hover:from-primary hover:to-primary-dark hover:shadow-[0_2px_4px_rgba(10,39,64,0.2),0_6px_18px_-4px_rgba(18,60,94,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:from-primary-light disabled:hover:to-primary disabled:active:scale-100 ${className ?? ''}`}
      {...rest}
    >
      {isLoading ? (
        <span className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <>
          <span>{label}</span>
          {icon}
        </>
      )}
    </button>
  );
}
