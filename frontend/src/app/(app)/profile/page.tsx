"use client";

import { useAsync } from "@/lib/use-async";
import { getProfile } from "@/api/profile";
import { listMyRegistrations } from "@/api/registrations";
import { listEvents } from "@/api/events";
import { formatEventDate } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui";

/**
 * Read-only: the API exposes GET /api/profile and nothing else, so there is no
 * edit affordance to offer.
 */
export default function ProfilePage() {
  const state = useAsync(async (signal) => {
    const [profile, registrations, events] = await Promise.all([
      getProfile(signal),
      listMyRegistrations(signal),
      listEvents(signal),
    ]);
    return { profile, registrations, events };
  }, []);

  if (state.loading) return <LoadingState label="Loading your profile…" />;
  if (state.error)
    return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;

  const { profile, registrations, events } = state.data;
  const byId = new Map(events.map((event) => [event._id, event]));

  return (
    <>
      <PageHeader title="Profile" description="Your CampusHub account." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold">Account</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </dt>
              <dd className="mt-1 text-sm">{profile.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </dt>
              <dd className="mt-1 text-sm">{profile.email}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
            Profile details are read-only — the API provides no update endpoint.
          </p>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold">Your event registrations</h2>
          </div>
          {registrations.length === 0 ? (
            <EmptyState
              title="No registrations yet"
              description="Register for an event and it will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {registrations.map((registration) => {
                const event = byId.get(registration.event);
                return (
                  <li key={registration._id} className="px-5 py-3">
                    <p className="text-sm font-medium">
                      {event ? event.title : "Event no longer available"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {event
                        ? `${formatEventDate(event.date)} · ${event.location}`
                        : "The event this registration points to has been removed."}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
