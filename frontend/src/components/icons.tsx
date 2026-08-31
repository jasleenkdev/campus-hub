/**
 * Inline icons, so the nav does not depend on glyph coverage in the user's
 * font. All share one 24×24 grid and inherit currentColor.
 */
type IconProps = { className?: string };

const base = "size-[18px] shrink-0";

function Svg({ className = "", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${base} ${className}`}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  );
}

export function StudentsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16.5 5.5a3 3 0 0 1 0 5.5" />
      <path d="M17.5 14.2a5.2 5.2 0 0 1 3 5.8" />
    </Svg>
  );
}

export function CoursesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19v2H5.5A1.5 1.5 0 0 1 4 19.5z" />
      <path d="M8 8h7" />
    </Svg>
  );
}

export function EventsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
    </Svg>
  );
}

export function AnnouncementsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5v5a1.5 1.5 0 0 0 1.5 1.5H8l5.5 4V4.5L8 8.5H5.5A1.5 1.5 0 0 0 4 10z" />
      <path d="M17.5 9a4 4 0 0 1 0 6" />
    </Svg>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}
