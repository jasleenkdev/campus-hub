"use client";

import { use } from "react";
import Link from "next/link";
import { useAsync } from "@/lib/use-async";
import { getStudent } from "@/api/students";
import { StudentForm } from "@/components/student-form";
import { ErrorState, LoadingState, PageHeader } from "@/components/ui";

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const student = useAsync((signal) => getStudent(id, signal), [id]);

  if (student.loading) return <LoadingState label="Loading student…" />;
  if (student.error)
    return <ErrorState message={student.error} onRetry={student.reload} />;
  if (!student.data) return null;

  return (
    <>
      <Link
        href={`/students/${id}`}
        className="mb-4 inline-block text-sm text-slate-500 hover:text-sky-600 hover:underline dark:hover:text-sky-400"
      >
        ← Back to student
      </Link>
      <PageHeader title={`Edit ${student.data.name}`} />
      <StudentForm
        mode="edit"
        studentId={id}
        initialName={student.data.name}
        initialCourseId={student.data.course?.id ?? ""}
      />
    </>
  );
}
