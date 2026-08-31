"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAsync } from "@/lib/use-async";
import { listCourses } from "@/api/courses";
import { createStudent, updateStudent } from "@/api/students";
import { toMessage } from "@/api/client";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Select,
} from "@/components/ui";

interface StudentFormProps {
  mode: "create" | "edit";
  studentId?: string;
  initialName?: string;
  initialCourseId?: string;
}

/**
 * Shared by the create and edit screens.
 *
 * Client-side validation is not optional here: the backend answers an empty
 * name or a malformed id on update with an opaque 500 (limitation L4), so
 * invalid input must never reach it.
 */
export function StudentForm({
  mode,
  studentId,
  initialName = "",
  initialCourseId = "",
}: StudentFormProps) {
  const router = useRouter();
  const { notify } = useToast();

  const courses = useAsync((signal) => listCourses(signal), []);

  const [name, setName] = useState(initialName);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [errors, setErrors] = useState<{ name?: string; course?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validate(): boolean {
    const next: { name?: string; course?: string } = {};
    if (name.trim() === "") next.name = "Enter the student's name.";
    if (courseId === "") next.course = "Choose a course.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await createStudent({
          name: name.trim(),
          course: courseId,
        });
        notify(`${created.name} was added.`, "success");
        router.replace(`/students/${created._id}`);
      } else if (studentId) {
        await updateStudent(studentId, { name: name.trim(), course: courseId });
        notify("Student updated.", "success");
        router.replace(`/students/${studentId}`);
      }
      router.refresh();
    } catch (caught) {
      setFormError(toMessage(caught));
      setSubmitting(false);
    }
  }

  if (courses.loading) return <LoadingState label="Loading courses…" />;
  if (courses.error)
    return <ErrorState message={courses.error} onRetry={courses.reload} />;

  const courseList = courses.data ?? [];

  return (
    <Card className="max-w-lg p-6">
      {courseList.length === 0 ? (
        <ErrorState message="No courses exist yet. Create a course before adding students — the API requires every student to reference one." />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Name" error={errors.name}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder="Jane Doe"
              autoFocus
            />
          </Field>

          <Field
            label="Course"
            error={errors.course}
            hint="Every student must be linked to a course."
          >
            <Select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              disabled={submitting}
            >
              <option value="">Select a course…</option>
              {courseList.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.name}
                </option>
              ))}
            </Select>
          </Field>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950 dark:text-red-200"
            >
              {formError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={submitting}>
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Add student"
                  : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
