"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAsync } from "@/lib/use-async";
import { deleteStudent, getStudent } from "@/api/students";
import { toMessage } from "@/api/client";
import { formatDuration } from "@/lib/format";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from "@/components/ui";

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { notify } = useToast();

  const student = useAsync((signal) => getStudent(id, signal), [id]);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteStudent(id);
      notify("Student deleted.", "success");
      router.replace("/students");
      router.refresh();
    } catch (caught) {
      notify(toMessage(caught), "error");
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (student.loading) return <LoadingState label="Loading student…" />;
  if (student.error)
    return (
      <>
        <BackLink />
        <ErrorState message={student.error} onRetry={student.reload} />
      </>
    );
  if (!student.data) return null;

  const { name, course } = student.data;

  return (
    <>
      <BackLink />
      <PageHeader
        title={name}
        actions={
          <>
            <LinkButton variant="secondary" href={`/students/${id}/edit`}>
              Edit
            </LinkButton>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete
            </Button>
          </>
        }
      />

      <Card className="max-w-lg p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Name
            </dt>
            <dd className="mt-1 text-sm">{name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Course
            </dt>
            <dd className="mt-1 text-sm">
              {course ? (
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{course.name}</Badge>
                  <span className="text-slate-500 dark:text-slate-400">
                    {formatDuration(course.duration)}
                  </span>
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
                  Not set — this student&apos;s course reference could not be
                  resolved.
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <ConfirmDialog
        open={confirming}
        busy={deleting}
        title="Delete this student?"
        description={`${name} will be permanently removed. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/students"
      className="mb-4 inline-block text-sm text-slate-500 hover:text-sky-600 hover:underline dark:hover:text-sky-400"
    >
      ← All students
    </Link>
  );
}
