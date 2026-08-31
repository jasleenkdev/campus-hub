import { ApiError, request } from "./client";
import type { Registration } from "./types";

/**
 * `GET /api/registrations/me` — the authenticated user's own registrations.
 *
 * Scoped server-side by the token's user. `event` is an unpopulated ObjectId
 * string, so callers join it against the events list themselves.
 */
export function listMyRegistrations(
  signal?: AbortSignal,
): Promise<Registration[]> {
  return request<Registration[]>("/api/registrations/me", { signal });
}

/** Convenience: the set of event ids this user is registered for. */
export async function getRegisteredEventIds(
  signal?: AbortSignal,
): Promise<Set<string>> {
  const registrations = await listMyRegistrations(signal);
  return new Set(registrations.map((registration) => registration.event));
}

/**
 * `POST /api/registrations` — requires a Bearer token (backend fix L6).
 *
 * The registering user is taken from the verified token; a `userId` in the body
 * is ignored, so only `eventId` is sent. An unknown event returns 404, and a
 * duplicate returns 409 — enforced by a unique {user, event} index, so the 409
 * holds even under concurrent requests.
 *
 * There is no cancel endpoint, so registration is irreversible through the API.
 */
export function registerForEvent(eventId: string): Promise<Registration> {
  return request<Registration>("/api/registrations", {
    method: "POST",
    body: { eventId },
  });
}

export type RegistrationOutcome = "registered" | "already-registered";

/**
 * Registers, treating the backend's 409 as a successful end state rather than
 * an error: both outcomes mean the user is registered for the event.
 */
export async function registerForEventIdempotent(
  eventId: string,
): Promise<RegistrationOutcome> {
  try {
    await registerForEvent(eventId);
    return "registered";
  } catch (error) {
    if (error instanceof ApiError && error.kind === "conflict") {
      return "already-registered";
    }
    throw error;
  }
}
