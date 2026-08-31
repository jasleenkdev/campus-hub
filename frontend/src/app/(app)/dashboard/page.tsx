"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useAsync } from "@/lib/use-async";
import { listStudents } from "@/api/students";
import { listCourses } from "@/api/courses";
import { listEvents } from "@/api/events";
import { listAnnouncements } from "@/api/announcements";
import { listMyRegistrations } from "@/api/registrations";
import { formatEventDate, formatTimestamp, isUpcoming } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

/**
 * Every number here comes from a real endpoint. The student count is a
 * deliberate exception to the "count" framing: GET /api/students returns no
 * total (limitation L3), so it is labelled as a page sample, not a total.
 */
export default function DashboardPage() {
  const { user } = useAuth();

  const state = useAsync(async (signal) => {
    const [students, courses, events, announcements, registrations] =
      await Promise.all([
        listStudents({ limit: 100 }, signal),
        listCourses(signal),
        listEvents(signal),
        listAnnouncements(signal),
        listMyRegistrations(signal),
      ]);
    return { students, courses, events, announcements, registrations };
  }, []);

  if (state.loading) return <LoadingState label="Loading your dashboard…" />;
  if (state.error)
    return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;

  const { students, courses, events, announcements, registrations } = state.data;

  const upcoming = events
    .filter((event) => isUpcoming(event.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = [...announcements]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name ?? ""}`}
        description="A live view of what's happening on campus."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={students.length === 100 ? "Students (first 100)" : "Students"}
          value={students.length}
          href="/students"
          note={students.length === 100 ? "API returns no total" : undefined}
        />
        <Stat label="Courses" value={courses.length} href="/courses" />
        <Stat label="Events" value={events.length} href="/events" />
        <Stat
          label="Announcements"
          value={announcements.length}
          href="/announcements"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Upcoming events" href="/events" />
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming events"
              description="Events with a date in the future will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming.slice(0, 4).map((event) => {
                const registered = registrations.some(
                  (registration) => registration.event === event._id,
                );
                return (
                  <li
                    key={event._id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {event.title}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {formatEventDate(event.date)} · {event.location}
                      </p>
                    </div>
                    {registered && (
                      <span className="shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ Registered
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Latest announcements" href="/announcements" />
          {latest.length === 0 ? (
            <EmptyState
              title="No announcements yet"
              description="Posted announcements will show up here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {latest.map((announcement) => (
                <li key={announcement._id} className="px-5 py-3">
                  <p className="text-sm font-medium">{announcement.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {announcement.message}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatTimestamp(announcement.date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
        You are registered for {registrations.length}{" "}
        {registrations.length === 1 ? "event" : "events"}.
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  href,
  note,
}: {
  label: string;
  value: number;
  href: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-800"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </Link>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
      <h2 className="text-sm font-semibold">{title}</h2>
      <Link
        href={href}
        // Negative margin keeps the visual position while giving the link a
        // 44px touch target on mobile.
        className="-my-2 -mr-2 inline-flex min-h-11 items-center px-2 text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
      >
        View all
      </Link>
    </div>
  );
}
