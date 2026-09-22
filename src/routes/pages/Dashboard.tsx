import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProfile, getCachedProfile } from '../../api/profileApi';
import { toast } from '../../lib/toast';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import {
  IconBadge,
  IconCalendar,
  IconChevronRight,
  IconFileUp,
  IconMail,
  IconMapPin,
  IconPhone,
  IconUser,
} from '../../components/icons';
import type { UserProfileModel } from '../../types/profile';
import { effectiveDisplayName, initialsOf, orDash, providerCode } from '../../utils/profileDisplay';

/**
 * `/home` index page — two-column layout: a compact profile card pinned to
 * the left (avatar, contact details, link to the full profile), and a right
 * column stacking Quick Links above a Centre Information activity-feed-style
 * list. Loads the cached profile immediately, then background-refreshes via
 * `profileApi`.
 */
export function Dashboard() {
  const [profile, setProfile] = useState<UserProfileModel | null>(() => getCachedProfile());
  const [loading, setLoading] = useState(() => getCachedProfile() == null);

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((fresh) => {
        if (!cancelled) setProfile(fresh);
      })
      .catch((err) => {
        // Cache-first: fall back to whatever was already loaded, if anything,
        // but still let the user know the refresh failed.
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not refresh dashboard data.';
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) {
    return loading ? <DashboardSkeleton /> : <DashboardEmptyState />;
  }

  const dcName = effectiveDisplayName(profile);

  return (
    <div className="flex flex-col ">
      <PageHeader title="Dashboard" description="An overview of your centre and the tools you use most." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <ProfileSidebarCard profile={profile} dcName={dcName} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {/* <h2 className="text-sm font-semibold text-text-primary">Quick Links</h2> */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <QuickLinkTile
                to="/home/profile"
                icon={<IconUser size={18} />}
                label="My Profile"
                description="View & edit details"
                accent="primary"
              />
              <QuickLinkTile
                to="/home/appointments"
                icon={<IconCalendar size={18} />}
                label="Appointments"
                description="Schedule & track"
                accent="accent"
              />
              <QuickLinkTile
                to="/home/upload-report"
                icon={<IconFileUp size={18} />}
                label="Upload Report"
                description="Diagnostic records"
                accent="gold"
              />
            </div>
          </div>

          <CentreInfoFeed profile={profile} />
        </div>
      </div>
    </div>
  );
}

function ProfileSidebarCard({ profile, dcName }: { profile: UserProfileModel; dcName: string }) {
  const code = providerCode(profile);
  return (
    <Card className="relative flex h-fit flex-col items-center gap-4 overflow-hidden py-6 text-center lg:sticky lg:top-6">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-gold" />
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-accent text-lg font-bold text-white shadow-[0_4px_16px_-2px_rgba(14,165,174,0.45)]">
        {initialsOf(dcName)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-text-primary">{dcName}</p>
        {code && (
          <span className="mt-1.5 inline-flex items-center rounded-full bg-surface-variant px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
            {code}
          </span>
        )}
      </div>

      <div className="h-px w-full bg-divider" />

      <div className="flex w-full flex-col gap-3 text-left">
        <SidebarContactRow icon={<IconMail size={14} />} value={orDash(profile.email)} />
        <SidebarContactRow icon={<IconPhone size={14} />} value={orDash(profile.mobileNo)} />
        <SidebarContactRow icon={<IconMapPin size={14} />} value={orDash(profile.address)} />
      </div>

      <Link to="/home/profile" className="w-full">
        <Button variant="secondary" fullWidth icon={<IconUser size={15} />}>
          My Profile
        </Button>
      </Link>
    </Card>
  );
}

function SidebarContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-variant text-text-secondary">
        {icon}
      </span>
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-text-primary">{value}</p>
    </div>
  );
}

const QUICK_LINK_ACCENTS = {
  primary: {
    badge: 'bg-gradient-to-br from-primary-light to-primary text-white',
    hoverShadow: 'group-hover:shadow-[0_10px_24px_-10px_rgba(18,60,94,0.45)]',
  },
  accent: {
    badge: 'bg-gradient-to-br from-accent-light to-accent text-white',
    hoverShadow: 'group-hover:shadow-[0_10px_24px_-10px_rgba(14,165,174,0.45)]',
  },
  gold: {
    badge: 'bg-gradient-to-br from-gold to-gold/80 text-white',
    hoverShadow: 'group-hover:shadow-[0_10px_24px_-10px_rgba(201,154,61,0.45)]',
  },
} as const;

function QuickLinkTile({
  to,
  icon,
  label,
  description,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  accent: keyof typeof QUICK_LINK_ACCENTS;
}) {
  const { badge, hoverShadow } = QUICK_LINK_ACCENTS[accent];
  return (
    <Link to={to}>
      <Card interactive className={`group flex h-full flex-col gap-3 transition-shadow duration-200 ${hoverShadow}`}>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md shadow-sm transition-transform duration-200 group-hover:scale-110 ${badge}`}
        >
          {icon}
        </span>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">{label}</p>
            <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
          </div>
          <IconChevronRight
            size={14}
            className="mb-0.5 shrink-0 text-text-tertiary opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </div>
      </Card>
    </Link>
  );
}

/** Centre Information rendered as a connected-node feed instead of a plain field grid. */
function CentreInfoFeed({ profile }: { profile: UserProfileModel }) {
  const items = [
    { icon: <IconBadge size={15} />, label: 'Provider Number', value: orDash(profile.providerNumber) },
    { icon: <IconMail size={15} />, label: 'Registered Email', value: orDash(profile.email) },
    { icon: <IconPhone size={15} />, label: 'Registered Mobile', value: orDash(profile.mobileNo) },
    { icon: <IconMapPin size={15} />, label: 'Centre Address', value: orDash(profile.address) },
  ];

  const badgeStyles = [
    'bg-gradient-to-br from-primary-light to-primary text-white',
    'bg-gradient-to-br from-accent-light to-accent text-white',
    'bg-gradient-to-br from-gold to-gold/80 text-white',
    'bg-gradient-to-br from-primary to-primary-dark text-white',
  ];

  return (
    <Card className="relative flex flex-col gap-1 overflow-hidden">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-primary to-gold" />
      <div className="flex items-center justify-between pb-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Centre Information</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Key details on file for this diagnostic centre</p>
        </div>
        <Link to="/home/profile" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="h-px bg-divider" />

      <div className="grid grid-cols-1 gap-x-6 pt-1 sm:grid-cols-2">
        {items.map((item, index) => {
          const isLastRowMobile = index === items.length - 1;
          const isLastRowDesktop = index >= items.length - 2;
          const isLeftColumn = index % 2 === 0;
          const borderClasses = [
            isLastRowMobile ? '' : 'border-b border-divider',
            isLastRowDesktop ? 'sm:border-b-0' : 'sm:border-b sm:border-divider',
            isLeftColumn ? 'sm:border-r sm:border-divider sm:pr-6' : 'sm:pl-6',
          ].join(' ');
          return (
            <div key={item.label} className={`flex items-center gap-3 py-3 ${borderClasses}`}>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md shadow-sm ${badgeStyles[index % badgeStyles.length]}`}
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-text-tertiary">{item.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-text-primary">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <div className="skeleton-shimmer h-9 w-1/3 rounded-md" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="skeleton-shimmer h-64 rounded-lg" />
        <div className="flex flex-col gap-6">
          <div className="skeleton-shimmer h-24 rounded-lg" />
          <div className="skeleton-shimmer h-64 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function DashboardEmptyState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-divider bg-surface p-10 text-center">
      <p className="text-base font-semibold text-text-primary">Could not load your dashboard</p>
    </div>
  );
}
