import { NavLink } from 'react-router-dom';
import symbolLogo from '../../assets/hs360-symbol-1024.png';
import { IconBuilding, IconCalendar, IconChevronRight, IconFileUp, IconHome, IconLockReset, IconUser } from '../icons';

export interface SideNavLink {
  to: string;
  label: string;
  icon: (props: { size?: number; className?: string }) => React.ReactElement;
  end?: boolean;
}

/** Primary sidebar destinations, in display order. */
export const SIDE_NAV_LINKS: SideNavLink[] = [
  { to: '/home', label: 'Home', icon: IconHome, end: true },
  { to: '/home/profile', label: 'DC Profile', icon: IconUser },
  { to: '/home/appointments', label: 'Appointments', icon: IconCalendar },
  { to: '/home/upload-report', label: 'Upload Report', icon: IconFileUp },
];

/** Secondary links — reachable from the sidebar but visually de-emphasized below the primary group. */
export const SIDE_NAV_SECONDARY_LINKS: SideNavLink[] = [
  { to: '/home/facility', label: 'Facility', icon: IconBuilding },
  { to: '/home/change-password', label: 'Change Password', icon: IconLockReset },
];

/**
 * Slim icon+label sidebar for the SaaS-admin shell. Collapses to an
 * icon-only rail (`collapsed`) on desktop, or renders full-width inside the
 * mobile overlay drawer. Rendered by `HomeLayout`.
 */
export function SideNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  /** Called after a nav link is activated — `HomeLayout` uses this to close the mobile drawer. */
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={`flex h-14 shrink-0 items-center gap-2.5 border-b border-divider ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
       <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
  <img src={symbolLogo} alt="" className="h-12 w-12 object-contain" />
</div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight text-text-primary">DC Portal</p>
            <p className="truncate text-[10.5px] leading-tight text-text-tertiary">HealthSphere 360</p>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {SIDE_NAV_LINKS.map((link) => (
          <SideNavItem key={link.to} link={link} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        <div className={`my-2 h-px bg-divider ${collapsed ? 'mx-1' : 'mx-2.5'}`} />

        {SIDE_NAV_SECONDARY_LINKS.map((link) => (
          <SideNavItem key={link.to} link={link} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-divider px-3.5 py-3">
          <p className="text-[10.5px] font-medium text-text-tertiary">HIPAA Compliant · Secure Portal</p>
        </div>
      )}
    </div>
  );
}

function SideNavItem({
  link,
  collapsed,
  onNavigate,
}: {
  link: SideNavLink;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const LinkIcon = link.icon;
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      title={collapsed ? link.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-200 ease-out ${
          collapsed ? 'justify-center' : ''
        } ${
          isActive
            ? 'bg-gradient-to-r from-primary-pale to-accent-pale/60 text-primary-dark'
            : 'text-text-secondary hover:bg-surface-variant hover:text-text-primary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-accent to-primary" />
          )}
          <LinkIcon
            size={18}
            className={`shrink-0 transition-colors duration-200 ease-out ${
              isActive ? 'text-accent-dark' : 'text-text-tertiary group-hover:text-text-secondary'
            }`}
          />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              {isActive && (
                <IconChevronRight size={14} className="animate-fade-in-up shrink-0 text-primary" />
              )}
            </>
          )}
        </>
      )}
    </NavLink>
  );
}
