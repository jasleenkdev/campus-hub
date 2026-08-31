"use client";

import { useState } from "react";
import { useAsync } from "@/lib/use-async";
import { createCourse, listCourses } from "@/api/courses";
import { toMessage } from "@/api/client";
import { formatDuration } from "@/lib/format";
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
} from "@/components/ui";

/**
 * The API supports listing and creating courses only — no detail, update or
 * delete endpoint exists, so none is offered here.
 */
export default function CoursesPage() {
  const courses = useAsync((signal) => listCourses(signal), []);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <PageHeader
        title="Courses"
        description="Courses students can be enrolled in."
        actions={
          <Button
            variant={showForm ? "secondary" : "primary"}
            onClick={() => setShowForm((open) => !open)}
          >
            {showForm ? "Cancel" : "Add course"}
          </Button>
        }
      />

      {showForm && (
        <CourseForm
          onCreated={() => {
            setShowForm(false);
            courses.reload();
          }}
        />
      )}

      <Card>
        {courses.loading ? (
          <LoadingState label="Loading courses…" />
        ) : courses.error ? (
          <ErrorState message={courses.error} onRetry={courses.reload} />
        ) : (courses.data ?? []).length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="Add a course before creating students — the API requires every student to reference one."
            action={<Button onClick={() => setShowForm(true)}>Add course</Button>}
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {(courses.data ?? []).map((course) => (
              <li
                key={course._id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{course.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {formatDuration(course.duration)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function CourseForm({ onCreated }: { onCreated: () => void }) {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [errors, setErrors] = useState<{ name?: string; duration?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);

    // The backend returns an opaque 500 for schema violations, so everything
    // is checked here first.
    const next: { name?: string; duration?: string } = {};
    if (name.trim() === "") next.name = "Enter a course name.";
    const parsed = Number(duration);
    if (duration.trim() === "") next.duration = "Enter a duration in years.";
    else if (!Number.isFinite(parsed) || parsed <= 0)
      next.duration = "Duration must be a positive number.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await createCourse({ name: name.trim(), duration: parsed });
      notify(`${name.trim()} was added.`, "success");
      setName("");
      setDuration("");
      onCreated();
    } catch (caught) {
      setFormError(toMessage(caught));
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-4 max-w-lg p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Course name" error={errors.name}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            placeholder="Computer Science"
            autoFocus
          />
        </Field>
        <Field label="Duration (years)" error={errors.duration}>
          <Input
            type="number"
            min="1"
            step="1"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            disabled={submitting}
            placeholder="4"
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
          {submitting ? "Adding…" : "Add course"}
        </Button>
      </form>
    </Card>
  );
}
