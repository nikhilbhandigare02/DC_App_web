import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fetchProfile, getCachedProfile } from '../api/profileApi';
import { SideNav, SIDE_NAV_LINKS, SIDE_NAV_SECONDARY_LINKS } from '../components/layout/SideNav';
import { SignOutDialog } from '../components/layout/SignOutDialog';
import { IconChevronRight, IconLockReset, IconLogOut, IconMenu, IconUser } from '../components/icons';
import type { UserProfileModel } from '../types/profile';
import { useAuthStore } from '../store/authStore';
import { effectiveDisplayName, initialsOf } from '../utils/profileDisplay';

/**
 * SaaS-admin convention: the sidebar collapses to an overlay drawer below
 * 1024px (not the old 768px mobile-first breakpoint) — at typical laptop
 * widths there's enough room for a persistent rail, so only tablet/phone
 * viewports get the drawer behavior.
 */
const DESKTOP_BREAKPOINT_PX = 1024;
const SIDEBAR_EXPANDED_PX = 232;
const SIDEBAR_COLLAPSED_PX = 68;
const COLLAPSE_STORAGE_KEY = 'dc-portal:sidebar-collapsed';

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT_PX;
}

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const ALL_NAV_LINKS = [...SIDE_NAV_LINKS, ...SIDE_NAV_SECONDARY_LINKS];

function pageTitleFor(pathname: string): string {
  if (pathname === '/home') return 'Home';
  const match = ALL_NAV_LINKS.find((link) => pathname.startsWith(link.to) && link.to !== '/home');
  if (match) return match.label;
  if (pathname.includes('/client-info')) return 'Client Information';
  return 'DC Portal';
}

/**
 * Shell for the authenticated `/home/*` area: a slim collapsible icon+label
 * sidebar on desktop (persistent, toggles between 232px and 68px, choice
 * remembered in localStorage), an overlay drawer below the 1024px
 * breakpoint, and a top bar with the current page title + a user avatar
 * menu (profile link + sign out). Replaces the old mobile-derived
 * hamburger-drawer-first shell.
 *
 * Owns a single background profile fetch (cache-first) so the top bar's
 * avatar/name appears instantly and refreshes quietly; `Dashboard` and
 * `Profile` pages fetch their own copy independently.
 */
export function HomeLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileModel | null>(() => getCachedProfile());
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(isDesktopViewport());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((fresh) => {
        if (!cancelled) setProfile(fresh);
      })
      .catch(() => {
        // Cache-first: a failed background refresh just keeps whatever was already rendered.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Close the mobile drawer and the avatar menu on every navigation.
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Best-effort persistence only.
      }
      return next;
    });
  }

  function handleSignOut() {
    logout();
    navigate('/login', { replace: true });
  }

  const displayName = effectiveDisplayName(profile);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_PX : SIDEBAR_EXPANDED_PX;
  const title = pageTitleFor(location.pathname);

  return (
    <div className="flex min-h-screen bg-background">
      {isDesktop ? (
        <aside
          className="sticky top-0 h-screen shrink-0 border-r border-divider bg-surface transition-[width] duration-200 ease-in-out"
          style={{ width: sidebarWidth }}
        >
          <SideNav collapsed={collapsed} />
        </aside>
      ) : (
        <>
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setMobileOpen(false)}
              role="presentation"
            />
          )}
          <aside
            className="fixed inset-y-0 left-0 z-50 border-r border-divider shadow-xl transition-transform duration-200 ease-in-out"
            style={{
              width: SIDEBAR_EXPANDED_PX,
              transform: mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_EXPANDED_PX}px)`,
            }}
          >
            <SideNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-divider bg-surface px-4 md:px-6">
          <button
            type="button"
            onClick={isDesktop ? toggleCollapsed : () => setMobileOpen(true)}
            title="Toggle navigation"
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-variant hover:text-text-primary"
          >
            <IconMenu size={18} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
            <span className="text-text-tertiary">DC Portal</span>
            <IconChevronRight size={13} className="shrink-0 text-text-tertiary" />
            <span className="truncate font-semibold text-text-primary">{title}</span>
          </div>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-md border border-divider py-1 pl-1 pr-2.5 hover:bg-surface-variant"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                {initialsOf(displayName)}
              </span>
              <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-text-primary sm:inline">
                {displayName}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-56 overflow-hidden rounded-lg border border-divider bg-surface shadow-lg">
                <div className="border-b border-divider px-3.5 py-2.5">
                  <p className="truncate text-[13px] font-semibold text-text-primary">{displayName}</p>
                  <p className="truncate text-xs text-text-tertiary">Diagnostic Centre Account</p>
                </div>
                <nav className="py-1">
                  <NavLink
                    to="/home/profile"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-text-primary hover:bg-surface-variant"
                  >
                    <IconUser size={16} className="text-text-tertiary" />
                    DC Profile
                  </NavLink>
                  <NavLink
                    to="/home/change-password"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-text-primary hover:bg-surface-variant"
                  >
                    <IconLockReset size={16} className="text-text-tertiary" />
                    Change Password
                  </NavLink>
                </nav>
                <div className="border-t border-divider py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmingSignOut(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-error hover:bg-error-pale"
                  >
                    <IconLogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>

      {confirmingSignOut && (
        <SignOutDialog onCancel={() => setConfirmingSignOut(false)} onConfirm={handleSignOut} />
      )}
    </div>
  );
}
