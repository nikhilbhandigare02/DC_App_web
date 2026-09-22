/**
 * Small hand-drawn stroke-icon set (Feather-style) so the app doesn't need
 * an icon-library dependency just for the handful of glyphs the sidebar and
 * profile/dashboard screens use. Each icon mirrors the Material icon used
 * in the Flutter reference screens closely enough to read the same way.
 */
import type { SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Icon({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </Icon>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </Icon>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </Icon>
  );
}

export function IconFileUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M12 11v6M9.5 13.5 12 11l2.5 2.5" />
    </Icon>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </Icon>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

export function IconMail(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </Icon>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 5 6.1 1.5 1.5 0 0 1 6.5 3.5Z" />
    </Icon>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </Icon>
  );
}

export function IconBadge(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9 13.5 7.5 21l4.5-2.5 4.5 2.5-1.5-7.5" />
    </Icon>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5l7 2.5v6c0 4.8-3 7.7-7 8.5-4-.8-7-3.7-7-8.5V6l7-2.5Z" />
    </Icon>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.6 4.5M20 20v-5h-5" />
    </Icon>
  );
}

export function IconWarning(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.5M12 17.5h.01" />
    </Icon>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5h.01" />
    </Icon>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="3.5" width="11" height="17" rx="1" />
      <path d="M9 7.5h3M9 11h3M9 14.5h3" />
      <path d="M16 10h3v10.5h-3" />
    </Icon>
  );
}

export function IconLockReset(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 7.6-1.8" />
      <path d="M12 15v2" />
    </Icon>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </Icon>
  );
}

export function IconStethoscope(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5v6a4 4 0 0 0 8 0v-6" />
      <path d="M6 3.5H4.5M14 3.5h1.5" />
      <path d="M14 9.5v2.5a6 6 0 0 1-12 0v-1" />
      <circle cx="18.5" cy="14.5" r="2" />
      <path d="M14 12v.5a4.5 4.5 0 0 0 4.5 4.5" />
    </Icon>
  );
}

export function IconCloudOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l16 16" />
      <path d="M8.5 8.7A4.5 4.5 0 0 0 9 17.5h8a3.7 3.7 0 0 0 1.2-7.2 5.5 5.5 0 0 0-9.4-4.3" />
    </Icon>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </Icon>
  );
}

export function IconApartment(props: IconProps) {
  return IconBuilding(props);
}

export function IconBolt(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 3 5 13.5h5.5L11 21l8-11h-5.5L13 3Z" />
    </Icon>
  );
}
