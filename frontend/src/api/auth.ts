import { request, tokenStore } from "./client";
import type { LoginResponse, SignupResponse } from "./types";

/**
 * `POST /api/auth/login` → { message, token, user }.
 * Rate limited to 10 requests / 15 min per IP (429).
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const result = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  tokenStore.set(result.token);
  tokenStore.setCachedUser(result.user);
  return result;
}

/**
 * `POST /api/auth/signup` → { message, user }.
 * Note: signup does NOT issue a token, so callers must log in afterwards.
 */
export function signup(
  name: string,
  email: string,
  password: string,
): Promise<SignupResponse> {
  return request<SignupResponse>("/api/auth/signup", {
    method: "POST",
    auth: false,
    body: { name, email, password },
  });
}

/**
 * `POST /api/auth/logout` is a stateless no-op server-side; clearing the token
 * locally is what actually ends the session. Never let it fail a logout.
 */
export async function logout(): Promise<void> {
  try {
    await request<{ message: string }>("/api/auth/logout", {
      method: "POST",
      auth: false,
    });
  } catch {
    /* ignore — logging out locally is what matters */
  } finally {
    tokenStore.clear();
  }
}
