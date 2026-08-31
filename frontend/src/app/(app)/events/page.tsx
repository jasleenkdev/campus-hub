"use client";

import { useState } from "react";
import { useAsync } from "@/lib/use-async";
import { createEvent, listEvents } from "@/api/events";
import {
  getRegisteredEventIds,
  registerForEventIdempotent,
} from "@/api/registrations";
import { toMessage } from "@/api/client";
import { dateInputToIso, formatEventDate, isUpcoming } from "@/lib/format";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
  Textarea,
} from "@/components/ui";

/**
 * Registration state is server-backed: GET /api/registrations/me supplies it on
 * load, and POST confirms it on click (201 newly registered, 409 already).
 * There is no cancel endpoint, so no cancel control is offered.
 */
export default function EventsPage() {
  const [showForm, setShowForm] = useState(false);

  const state = useAsync(async (signal) => {
    const [events, registeredIds] = await Promise.all([
      listEvents(signal),
      getRegisteredEventIds(signal),
    ]);
    return { events, registeredIds };
  }, []);

  const [registered, setRegistered] = useState<Set<string> | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { notify } = useToast();

  const registeredIds = registered ?? state.data?.registeredIds ?? new Set();

  async function handleRegister(eventId: string, title: string) {
    if (pendingId) return;
    setPendingId(eventId);
    try {
      const outcome = await registerForEventIdempotent(eventId);
      setRegistered(new Set([...registeredIds, eventId]));
      notify(
        outcome === "registered"
          ? `You're registered for ${title}.`
          : `You were already registered for ${title}.`,
        outcome === "registered" ? "success" : "info",
      );
    } catch (caught) {
      notify(toMessage(caught), "error");
    } finally {
      setPendingId(null);
    }
  }

  const events = state.data?.events ?? [];
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeader
        title="Events"
        description="Campus events you can register for."
        actions={
          <Button
            variant={showForm ? "secondary" : "primary"}
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Cancel" : "Create event"}
          </Button>
        }
      />

      {showForm && (
        <EventForm
          onCreated={() => {
            setShowForm(false);
            setRegistered(null);
            state.reload();
          }}
        />
      )}

      {state.loading ? (
        <Card>
          <LoadingState label="Loading events…" />
        </Card>
      ) : state.error ? (
        <Card>
          <ErrorState message={state.error} onRetry={state.reload} />
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState
            title="No events yet"
            description="Create the first campus event."
            action={<Button onClick={() => setShowForm(true)}>Create event</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sorted.map((event) => {
            const isRegistered = registeredIds.has(event._id);
            const upcoming = isUpcoming(event.date);
            return (
              <li key={event._id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="font-medium">{event.title}</h2>
                    {!upcoming && <Badge>Past</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {event.description}
                  </p>
                  <dl className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex gap-2">
                      <dt className="font-medium">When</dt>
                      <dd>{formatEventDate(event.date)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium">Where</dt>
                      <dd>{event.location}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 pt-1">
                    {isRegistered ? (
                      <Badge tone="success">✓ Registered</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        loading={pendingId === event._id}
                        disabled={pendingId !== null}
                        onClick={() => handleRegister(event._id, event.title)}
                      >
                        {pendingId === event._id ? "Registering…" : "Register"}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {!state.loading && !state.error && sorted.length > 0 && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Registration cannot be undone through the API — there is no cancel
          endpoint.
        </p>
      )}
    </>
  );
}

function EventForm({ onCreated }: { onCreated: () => void }) {
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    // All four fields are required by the schema, and a violation returns an
    // opaque 500, so validate everything before sending.
    const next: Record<string, string> = {};
    if (title.trim() === "") next.title = "Enter a title.";
    if (description.trim() === "") next.description = "Enter a description.";
    if (date === "") next.date = "Choose a date.";
    if (location.trim() === "") next.location = "Enter a location.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        date: dateInputToIso(date),
        location: location.trim(),
      });
      notify(`${title.trim()} was created.`, "success");
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      onCreated();
    } catch (caught) {
      setFormError(toMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-4 max-w-lg p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Title" error={errors.title}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            placeholder="Hackathon 2026"
            autoFocus
          />
        </Field>
        <Field label="Description" error={errors.description}>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            placeholder="24-hour coding competition"
          />
        </Field>
        <Field
          label="Date"
          error={errors.date}
          hint="Stored and displayed in UTC."
        >
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
        </Field>
        <Field label="Location" error={errors.location}>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={submitting}
            placeholder="Main Auditorium"
          />
        </Field>
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950 dark:text-red-200"
          >
            {formError}
          </p>
        )}
        <Button type="submit" loading={submitting}>
          {submitting ? "Creating…" : "Create event"}
        </Button>
      </form>
    </Card>
  );
}
