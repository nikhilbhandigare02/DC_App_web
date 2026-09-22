import type { ReactNode } from 'react';
import logo from '../../assets/hs360-symbol-1024.png';
import { ShieldIcon } from './icons';

/** Ported from the old `lib/widgets/auth/auth_copyright.dart` footer line. */
function AuthCopyright() {
  return (
    <p className="text-center text-xs text-text-tertiary">
      © {new Date().getFullYear()} HealthSphere 360. All rights reserved.
    </p>
  );
}

const BRAND_HIGHLIGHTS = [
  'Manage assigned diagnostic cases in one place',
  'Track appointments and upload reports securely',
  'HIPAA-compliant, end-to-end encrypted portal',
];

/** Left branding panel shown alongside the form on wide viewports (`variant="fullscreen"` only). */
function BrandPanel() {
  return (
    <div className="relative hidden w-[420px] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-primary-dark px-10 py-12 text-white lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 z-0 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-16 z-0 h-64 w-64 rounded-full bg-gold/15 blur-3xl"
      />
      <div className="relative z-10 flex items-center gap-3">
       <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-white shadow-[0_0_24px_4px_rgba(14,165,174,0.35)]">
  <img src={logo} alt="" className="h-8 w-8 object-contain" />
</div>
        <span className="text-[15px] font-semibold">DC Portal</span>
      </div>

      <div className="relative z-10">
        <h2 className="text-[28px] font-semibold leading-tight">
          Diagnostic Centre
          <br />
          Case Management
        </h2>
        <p className="mt-3 max-w-sm text-sm text-white/75">
          A single, secure workspace for TPA / PIMS diagnostic centre operations.
        </p>
        <ul className="mt-7 flex flex-col gap-3">
          {BRAND_HIGHLIGHTS.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[13px] text-white/85">
              <ShieldIcon />
              <span className="mt-[-1px]">{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/50">© {new Date().getFullYear()} HealthSphere 360</p>
    </div>
  );
}

interface AuthFormCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Unused visually now (kept for API stability); a fixed compact mark is used instead. */
  logoSize?: number;
  /**
   * `fullscreen` (default) renders the branding split-screen page used by
   * Login/ForgotPassword/SetNewPassword/FirstLoginPassword. `embedded`
   * renders just the form card, for screens already inside the
   * authenticated shell's chrome (e.g. `ChangePassword` under `/home/*`).
   */
  variant?: 'fullscreen' | 'embedded';
}

/**
 * Shared shell for every auth screen: a split-screen layout with a brand
 * panel on the left (desktop) and the form in a plain bordered card on the
 * right — replaces the old centered-card-with-floating-blobs mobile look.
 */
export function AuthFormCard({ title, subtitle, children, variant = 'fullscreen' }: AuthFormCardProps) {
  const formCard = (
    <div className="animate-fade-in-up w-full max-w-[400px]">
      <div className="lg:hidden mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary shadow-[0_4px_14px_-2px_rgba(18,60,94,0.45)]">
          <img src={logo} alt="" className="h-5 w-5 object-contain" />
        </div>
        <span className="text-sm font-semibold text-text-primary">DC Portal</span>
      </div>

      <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{subtitle}</p>

      <div className="auth-stagger mt-7 flex flex-col gap-0">{children}</div>

      {variant === 'fullscreen' && (
        <div className="mt-8">
          <AuthCopyright />
        </div>
      )}
    </div>
  );

  if (variant === 'embedded') {
    return (
      <div className="flex justify-center px-2 py-4">
        <div className="w-full max-w-[420px] rounded-lg border border-divider bg-surface p-6 sm:p-8">
          {formCard}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">{formCard}</div>
    </div>
  );
}
