import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProfile, getCachedProfile } from '../../api/profileApi';
import { toast } from '../../lib/toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  IconBadge,
  IconBuilding,
  IconCloudOff,
  IconCopy,
  IconInfo,
  IconLockReset,
  IconMail,
  IconMapPin,
  IconPhone,
  IconRefresh,
  IconShield,
  IconWarning,
} from '../../components/icons';
import type { UserProfileModel } from '../../types/profile';
import { effectiveDisplayName, initialsOf, orDash } from '../../utils/profileDisplay';

/**
 * `/home/profile` — "My Profile" / DC information page, ported from
 * `lib/screens/dc_information/dc_information_screen_web.dart`: a label/value
 * info panel, contact support section, a stale-data banner when a background
 * refresh fails but cached data is still on screen, an error state when
 * there's nothing to show at all, and quick actions linking to Change
 * Password / Facility (owned by other agents — link only, no page code).
 */
export function Profile() {
  const [profile, setProfile] = useState<UserProfileModel | null>(() => getCachedProfile());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    if (!profile) {
      const cached = getCachedProfile();
      if (cached) setProfile(cached);
    }
    try {
      const fresh = await fetchProfile();
      setProfile(fresh);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load centre information.';
      setError(message);
      toast.error(message);
      // Detailed error text is surfaced via the toast above; on-screen state
      // (StaleBanner / ErrorState) only shows a short, static description.
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, []);

  if (!profile) {
    if (loading) return <ProfileSkeleton />;
    return <ErrorState onRetry={load} />;
  }

  const dcName = effectiveDisplayName(profile);
  const addressLine = [profile.address1, profile.address2, profile.address3]
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(', ');
  const fullAddress = [addressLine, profile.city, profile.pincode]
    .filter((value) => value.trim().length > 0)
    .join(', ');

  return (
    <div className="flex flex-col gap-5">
      <ProfileHero profile={profile} dcName={dcName} />

      {error && <StaleBanner onRetry={load} />}

      <Card className="relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-accent-dark" />
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent-light to-accent text-white shadow-sm">
              <IconMapPin size={14} />
            </span>
            <p className="text-sm font-semibold text-text-primary">Address</p>
          </div>
          <GhostButton icon={<IconCopy size={13} />} label="Copy" onClick={() => copyToClipboard('Address', fullAddress)} />
        </div>
        <div className="h-px bg-divider" />
        <div className="grid grid-cols-1 gap-4 pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <FieldValue label="Address" value={orDash(addressLine)} />
          <FieldValue label="City" value={orDash(profile.city)} />
          <FieldValue label="Pincode" value={orDash(profile.pincode)} />
          <FieldValue label="State" value={orDash(profile.state)} />
        </div>
      </Card>

      <Card className="relative overflow-hidden">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-dark" />
        <div className="flex items-center gap-2 pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-primary text-white shadow-sm">
            <IconPhone size={14} />
          </span>
          <p className="text-sm font-semibold text-text-primary">Contact Support</p>
        </div>
        <div className="h-px bg-divider" />
        <div className="grid grid-cols-1 gap-3 pt-3.5 sm:grid-cols-2">
          <DetailRow
            icon={<IconMail size={15} />}
            label="Email"
            value={orDash(profile.email)}
            onCopy={profile.email ? () => copyToClipboard('Email', profile.email) : undefined}
          />
          <DetailRow
            icon={<IconPhone size={15} />}
            label="Mobile"
            value={orDash(profile.mobileNo)}
            onCopy={profile.mobileNo ? () => copyToClipboard('Mobile number', profile.mobileNo) : undefined}
          />
        </div>
      </Card>

      <div>
        <p className="mb-2.5 text-sm font-semibold text-text-primary">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/home/change-password">
            <Button
              variant="secondary"
              className="hover:border-accent/40 hover:shadow-[0_4px_14px_-4px_rgba(14,165,174,0.35)]"
              icon={
                <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-accent-light to-accent text-white">
                  <IconLockReset size={12} />
                </span>
              }
            >
              Change Password
            </Button>
          </Link>
          <Link to="/home/facility">
            <Button
              variant="secondary"
              className="hover:border-primary/40 hover:shadow-[0_4px_14px_-4px_rgba(18,60,94,0.35)]"
              icon={
                <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary-light to-primary text-white">
                  <IconBuilding size={12} />
                </span>
              }
            >
              Facility
            </Button>
          </Link>
        </div>
      </div>

      <FooterNote />
    </div>
  );
}

function ProfileHero({ profile, dcName }: { profile: UserProfileModel; dcName: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-primary-dark px-6 py-6 shadow-sm sm:px-8">
      <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-14 right-20 h-32 w-32 rounded-full bg-accent/20" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-lg font-bold text-white backdrop-blur-sm">
            {initialsOf(dcName)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">DC Information</p>
            <h1 className="mt-0.5 truncate text-xl font-bold text-white sm:text-2xl">{dcName}</h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-white/80">
              <IconBadge size={13} />
              Provider No. {orDash(profile.providerNumber)}
            </div>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <IconShield size={12} />
          Secure
        </span>
      </div>
    </div>
  );
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

function GhostButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-md bg-surface-variant px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-divider/60"
    >
      {icon}
      {label}
    </button>
  );
}

function copyToClipboard(label: string, value: string) {
  if (!value || value === '-') return;
  navigator.clipboard
    ?.writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => {
      // Clipboard access can be denied by the browser — silently ignore, the
      // value is still visible on screen for the user to select manually.
    });
}

function DetailRow({
  icon,
  label,
  value,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-divider px-3 py-2.5 transition-colors duration-150 hover:border-accent/30">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent-pale to-accent-light/30 text-accent-dark shadow-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-text-tertiary">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-text-primary">{value}</p>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-variant hover:text-text-primary"
        >
          <IconCopy size={14} />
        </button>
      )}
    </div>
  );
}

function FooterNote() {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-primary/15 bg-gradient-to-r from-primary-pale/70 to-accent-pale/40 px-3.5 py-2.5">
      <IconInfo size={15} className="mt-0.5 shrink-0 text-primary" />
      <p className="text-xs leading-relaxed text-text-secondary">
        These details come from your empanelment record. Contact support to request a correction.
      </p>
    </div>
  );
}

function StaleBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning-pale px-3.5 py-2.5">
      <IconWarning size={16} className="shrink-0 text-warning" />
      <p className="flex-1 text-xs font-medium text-text-secondary">Showing saved details.</p>
      <GhostButton icon={<IconRefresh size={13} />} label="Retry" onClick={onRetry} />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-error-pale">
        <IconCloudOff size={26} className="text-error" />
      </div>
      <div>
        <p className="text-base font-semibold text-text-primary">Could not load centre information</p>
      </div>
      <Button variant="primary" icon={<IconRefresh size={16} />} onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="skeleton-shimmer h-24 rounded-xl" />
      <div className="skeleton-shimmer h-32 rounded-lg" />
      <div className="skeleton-shimmer h-28 rounded-lg" />
      <div className="skeleton-shimmer h-16 rounded-lg" />
    </div>
  );
}
