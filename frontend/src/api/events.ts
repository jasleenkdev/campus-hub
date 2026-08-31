import { request } from "./client";
import type { CampusEvent } from "./types";

/**
 * `GET /api/events` → raw array. Public, unpaginated, insertion-ordered.
 * There is no `GET /api/events/:id`, so detail views read from this list.
 */
export function listEvents(signal?: AbortSignal): Promise<CampusEvent[]> {
  return request<CampusEvent[]>("/api/events", { auth: false, signal });
}

/**
 * `POST /api/events` → raw doc. Public. All four fields are required by the
 * schema and a violation returns an opaque 500, so validate client-side.
 */
export function createEvent(input: {
  title: string;
  description: string;
  date: string;
  location: string;
}): Promise<CampusEvent> {
  return request<CampusEvent>("/api/events", {
    method: "POST",
    auth: false,
    body: input,
  });
}
