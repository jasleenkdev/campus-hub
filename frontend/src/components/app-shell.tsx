"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";
import {
  AnnouncementsIcon,
  CoursesIcon,
  DashboardIcon,
  EventsIcon,
  ProfileIcon,
  StudentsIcon,
} from "@/components/icons";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/students", label: "Students", Icon: StudentsIcon },
  { href: "/courses", label: "Courses", Icon: CoursesIcon },
  { href: "/events", label: "Events", Icon: EventsIcon },
  { href: "/announcements", label: "Announcements", Icon: AnnouncementsIcon },
  { href: "/profile", label: "Profile", Icon: ProfileIcon },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close the mobile menu on any navigation, including browser back/forward.
  // Adjusted during render rather than from an effect, so the menu never paints
  // open for a frame on the new route.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  const navLinks = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <item.Icon className={active ? "" : "opacity-70"} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg dark:focus:bg-slate-800"
      >
        Skip to content
      </a>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Link
          href="/dashboard"
          className="-my-2 inline-flex min-h-11 items-center font-semibold tracking-tight"
        >
          CampusHub
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span aria-hidden className="text-lg leading-none">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>
      </header>

      {menuOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden dark:border-slate-800 dark:bg-slate-900">
          {navLinks}
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <UserBlock
              name={user?.name ?? ""}
              email={user?.email ?? ""}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            CampusHub
          </Link>
        </div>
        <div className="flex-1 px-3">{navLinks}</div>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <UserBlock
            name={user?.name ?? ""}
            email={user?.email ?? ""}
            onLogout={handleLogout}
            loggingOut={loggingOut}
          />
        </div>
      </aside>

      <main
        id="main-content"
        className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function UserBlock({
  name,
  email,
  onLogout,
  loggingOut,
}: {
  name: string;
  email: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300"
        >
          {initials(name) || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {email}
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        onClick={onLogout}
        loading={loggingOut}
        className="w-full"
      >
        {loggingOut ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
