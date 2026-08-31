"use client";

import { PageHeader } from "@/components/ui";
import { StudentForm } from "@/components/student-form";

export default function NewStudentPage() {
  return (
    <>
      <PageHeader
        title="Add student"
        description="Students are linked to a course by the API."
      />
      <StudentForm mode="create" />
    </>
  );
}
