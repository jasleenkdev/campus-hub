import { request } from "./client";
import type { User } from "./types";

/**
 * `GET /api/profile` → { id, name, email } (not enveloped). Requires a token.
 * There is no update endpoint, so the profile screen is read-only.
 */
export function getProfile(signal?: AbortSignal): Promise<User> {
  return request<User>("/api/profile", { signal });
}
