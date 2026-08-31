import { request } from "./client";
import type { Announcement } from "./types";

/**
 * `GET /api/announcements` → raw array. Public, unpaginated, and NOT sorted
 * newest-first — callers sort by `date` themselves.
 */
export function listAnnouncements(
  signal?: AbortSignal,
): Promise<Announcement[]> {
  return request<Announcement[]>("/api/announcements", {
    auth: false,
    signal,
  });
}

/** `POST /api/announcements` → raw doc. Public. `date` is set server-side. */
export function createAnnouncement(input: {
  title: string;
  message: string;
}): Promise<Announcement> {
  return request<Announcement>("/api/announcements", {
    method: "POST",
    auth: false,
    body: input,
  });
}
