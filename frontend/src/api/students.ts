import { request, requestEnveloped, requestKeyed } from "./client";
import type { Student, StudentDoc, StudentQuery } from "./types";

/**
 * `GET /api/students` — server-side search/sort/pagination. All routes here
 * require a token.
 *
 * Items are `{ id, name, course }` where `course` is the populated
 * `{ id, name, duration }` object (fix L2) or null when unresolvable (D1).
 * The backend returns no total count (L3), so there is no page total.
 */
export function listStudents(
  query: StudentQuery = {},
  signal?: AbortSignal,
): Promise<Student[]> {
  return requestEnveloped<Student[]>("/api/students", {
    query: { ...query },
    signal,
  });
}

/** `GET /api/students/:id` → enveloped `{ id, name, course }`. 400 on a malformed id. */
export function getStudent(id: string, signal?: AbortSignal): Promise<Student> {
  return requestEnveloped<Student>(`/api/students/${id}`, { signal });
}

/**
 * `POST /api/students` → `{ message, student }` with a raw doc whose `course`
 * is an unpopulated id string — unlike the read endpoints, which populate it.
 */
export function createStudent(input: {
  name: string;
  course: string;
}): Promise<StudentDoc> {
  return requestKeyed<StudentDoc>("/api/students", "student", {
    method: "POST",
    body: input,
  });
}

/**
 * `PUT /api/students/:id` → `{ message, student }`.
 *
 * The backend has no ObjectId guard and no validation-error mapping here, so a
 * malformed id or an empty name comes back as an opaque 500 (limitation L4).
 * Callers must validate before submitting.
 */
export function updateStudent(
  id: string,
  input: { name?: string; course?: string },
): Promise<StudentDoc> {
  return requestKeyed<StudentDoc>(`/api/students/${id}`, "student", {
    method: "PUT",
    body: input,
  });
}

/** `DELETE /api/students/:id` → `{ message }`. */
export function deleteStudent(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/students/${id}`, {
    method: "DELETE",
  });
}
