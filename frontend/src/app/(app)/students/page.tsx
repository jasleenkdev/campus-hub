"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAsync } from "@/lib/use-async";
import { listStudents } from "@/api/students";
import { listCourses } from "@/api/courses";
import { formatDuration } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingState,
  PageHeader,
  Select,
} from "@/components/ui";

const PAGE_SIZE = 10;

const SORTS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "-name", label: "Name (Z–A)" },
  { value: "", label: "Default order" },
];

/**
 * Search, sort and pagination are all server-side, using the backend's own
 * query params. The backend returns no total count (L3), so pagination is
 * prev/next inferred from whether a full page came back.
 */
export default function StudentsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [course, setCourse] = useState("");
  const [page, setPage] = useState(1);

  // Debounce so each keystroke is not a request.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const courses = useAsync((signal) => listCourses(signal), []);

  const students = useAsync(
    (signal) =>
      listStudents(
        {
          search: search || undefined,
          sort: sort || undefined,
          course: course || undefined,
          page,
          limit: PAGE_SIZE,
        },
        signal,
      ),
    [search, sort, course, page],
  );

  const rows = students.data ?? [];
  const hasNextPage = rows.length === PAGE_SIZE;
  const filtered = search !== "" || course !== "";

  return (
    <>
      <PageHeader
        title="Students"
        description="Search, sort and page through students — all handled by the API."
        actions={<LinkButton href="/students/new">Add student</LinkButton>}
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name…"
              aria-label="Search students by name"
            />
          </div>
          <Select
            value={course}
            aria-label="Filter by course"
            onChange={(event) => {
              setCourse(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All courses</option>
            {(courses.data ?? []).map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            aria-label="Sort students"
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            {SORTS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {students.loading ? (
          <LoadingState label="Loading students…" />
        ) : students.error ? (
          <ErrorState message={students.error} onRetry={students.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No students match your filters" : "No students yet"}
            description={
              filtered
                ? "Try a different name or clear the course filter."
                : "Add the first student to get started."
            }
            action={
              filtered ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchInput("");
                    setCourse("");
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <LinkButton href="/students/new">Add student</LinkButton>
              )
            }
          />
        ) : (
          <>
            {/* Table on wide screens */}
            <table className="hidden w-full text-left text-sm sm:table">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Course</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((student) => (
                  <tr
                    key={student.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-3 font-medium">
                      <Link
                        href={`/students/${student.id}`}
                        className="hover:text-sky-600 hover:underline dark:hover:text-sky-400"
                      >
                        {student.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {student.course ? (
                        <Badge tone="info">{student.course.name}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Not set
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/students/${student.id}`}
                        className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Cards on small screens */}
            <ul className="divide-y divide-slate-100 sm:hidden dark:divide-slate-800">
              {rows.map((student) => (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{student.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {student.course
                          ? `${student.course.name} · ${formatDuration(student.course.duration)}`
                          : "Course not set"}
                      </p>
                    </div>
                    <span aria-hidden className="text-slate-300">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {!students.loading && !students.error && (page > 1 || hasNextPage) && (
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            ← Previous
          </Button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <Button
            variant="secondary"
            disabled={!hasNextPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </>
  );
}
