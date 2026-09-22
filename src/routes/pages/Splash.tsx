import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import logo from '../../assets/hs360-symbol-1024.png';
import { getIsLogin } from '../../lib/storage';

const REDIRECT_DELAY_MS = 1500;

/**
 * `/` — brief branded loading screen shown while the app decides where to
 * send the user. After a short delay, checks `storage.getIsLogin()` and
 * redirects to `/home` or `/login`. Kept intentionally restrained (no
 * bouncing/pulsing decoration) to match the SaaS-admin visual language.
 */
export function Splash() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (done) {
    return <Navigate to={getIsLogin() ? '/home' : '/login'} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-fade-in-up flex flex-col items-center px-6 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary-light to-primary shadow-[0_8px_28px_-6px_rgba(18,60,94,0.5)]">
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-accent/20 blur-2xl"
          />
          <img src={logo} alt="HealthSphere 360" className="h-9 w-9 object-contain" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-text-primary">DC Portal</h1>
        <p className="mt-1 text-sm text-text-secondary">Diagnostic Centre · TPA / PIMS Case Management</p>
        <span className="mt-6 h-5 w-5 animate-spin rounded-full border-2 border-divider border-t-primary" />
      </div>
    </div>
  );
}
