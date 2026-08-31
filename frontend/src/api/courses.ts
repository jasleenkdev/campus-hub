import { request } from "./client";
import type { Course } from "./types";

/**
 * `GET /api/courses` → raw array. Public, unpaginated, unsorted.
 * There is no `GET /api/courses/:id`, so detail views read from this list.
 */
export function listCourses(signal?: AbortSignal): Promise<Course[]> {
  return request<Course[]>("/api/courses", { auth: false, signal });
}

/**
 * `POST /api/courses` → raw doc. Public — the backend requires no token here.
 * A missing/invalid field comes back as an opaque 500, so validate client-side.
 */
export function createCourse(input: {
  name: string;
  duration: number;
}): Promise<Course> {
  return request<Course>("/api/courses", {
    method: "POST",
    auth: false,
    body: input,
  });
}
