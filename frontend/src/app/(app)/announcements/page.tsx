"use client";

import { useState } from "react";
import { useAsync } from "@/lib/use-async";
import { createAnnouncement, listAnnouncements } from "@/api/announcements";
import { toMessage } from "@/api/client";
import { formatTimestamp } from "@/lib/format";
import { useToast } from "@/components/toast";
import {
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
 * The API returns announcements unsorted and unpaginated, so newest-first
 * ordering is applied here.
 */
export default function AnnouncementsPage() {
  const announcements = useAsync((signal) => listAnnouncements(signal), []);
  const [showForm, setShowForm] = useState(false);

  const sorted = [...(announcements.data ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Campus-wide notices, newest first."
        actions={
          <Button
            variant={showForm ? "secondary" : "primary"}
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Cancel" : "Post announcement"}
          </Button>
        }
      />

      {showForm && (
        <AnnouncementForm
          onCreated={() => {
            setShowForm(false);
            announcements.reload();
          }}
        />
      )}

      <Card>
        {announcements.loading ? (
          <LoadingState label="Loading announcements…" />
        ) : announcements.error ? (
          <ErrorState
            message={announcements.error}
            onRetry={announcements.reload}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="Post the first one to let everyone know what's happening."
            action={
              <Button onClick={() => setShowForm(true)}>Post announcement</Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((announcement) => (
              <li key={announcement._id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-medium">{announcement.title}</h2>
                  <time className="text-xs text-slate-400">
                    {formatTimestamp(announcement.date)}
                  </time>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                  {announcement.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function AnnouncementForm({ onCreated }: { onCreated: () => void }) {
  const { notify } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const next: Record<string, string> = {};
    if (title.trim() === "") next.title = "Enter a title.";
    if (message.trim() === "") next.message = "Enter a message.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await createAnnouncement({ title: title.trim(), message: message.trim() });
      notify("Announcement posted.", "success");
      setTitle("");
      setMessage("");
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
            placeholder="Hackathon registration open"
            autoFocus
          />
        </Field>
        <Field label="Message" error={errors.message}>
          <Textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
            placeholder="Registration for Hackathon 2026 is now open."
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
          {submitting ? "Posting…" : "Post announcement"}
        </Button>
      </form>
    </Card>
  );
}
