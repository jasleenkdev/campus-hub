/**
 * The single place the frontend talks to the backend.
 *
 * Everything that is awkward about the CampusHub API is absorbed here so that
 * screens never have to think about it:
 *   - three different success envelopes (see FRONTEND_API_MAP.md §4)
 *   - error bodies that are sometimes JSON `{message}` and sometimes an HTML
 *     page (unmatched routes 404 as HTML — limitation L12)
 *   - 500s that really mean "you sent invalid input" (limitation L4)
 *   - a 1-hour JWT with no refresh, so any 401 ends the session (L15)
 */

const BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

const TOKEN_KEY = "campushub.token";
const USER_KEY = "campushub.user";

/* ------------------------------------------------------------------ *
 * Token storage
 * ------------------------------------------------------------------ */

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private browsing / storage disabled — session stays in memory only */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  },
  getCachedUser<T>(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  setCachedUser(user: unknown) {
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  },
};

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export type ApiErrorKind =
  | "validation"    // 400
  | "unauthorized"  // 401
  | "forbidden"     // 403
  | "notFound"      // 404
  | "conflict"      // 409
  | "rateLimited"   // 429
  | "server"        // 5xx
  | "network";      // request never completed

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  /** True when the body was HTML rather than JSON (see L12). */
  readonly isHtmlBody: boolean;

  constructor(
    message: string,
    status: number,
    kind: ApiErrorKind,
    isHtmlBody = false,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
    this.isHtmlBody = isHtmlBody;
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 429) return "rateLimited";
  return "server";
}

const FALLBACK_MESSAGE: Record<ApiErrorKind, string> = {
  validation: "Some of the information you entered isn't valid.",
  unauthorized: "Your session has ended. Please sign in again.",
  forbidden: "You don't have permission to do that.",
  notFound: "We couldn't find what you were looking for.",
  conflict: "That conflicts with something that already exists.",
  rateLimited: "Too many attempts. Please wait a few minutes and try again.",
  server: "The server ran into a problem. Please try again.",
  network: "Can't reach the server. Check that the backend is running.",
};

/* ------------------------------------------------------------------ *
 * Session-expiry notification
 * ------------------------------------------------------------------ */

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** The auth provider subscribes so a 401 anywhere can clear state and redirect. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

/* ------------------------------------------------------------------ *
 * Request
 * ------------------------------------------------------------------ */

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the bearer token. Default true; the auth endpoints opt out. */
  auth?: boolean;
  query?: Record<string, string | number | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Reads a response body without assuming it is JSON — the backend returns HTML
 * for unmatched routes, and did so for announcement errors before L1 was fixed.
 */
async function readBody(
  response: Response,
): Promise<{ data: unknown; isHtml: boolean }> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text) return { data: null, isHtml: false };

  if (contentType.includes("application/json")) {
    try {
      return { data: JSON.parse(text), isHtml: false };
    } catch {
      return { data: null, isHtml: false };
    }
  }
  return { data: text, isHtml: /^\s*<(!doctype|html)/i.test(text) };
}

function extractMessage(data: unknown): string | null {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return null;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true, query, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = tokenStore.get();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(FALLBACK_MESSAGE.network, 0, "network");
  }

  const { data, isHtml } = await readBody(response);

  if (!response.ok) {
    const kind = kindForStatus(response.status);

    // A 401 on an authenticated call means the session is over. A 401 from the
    // auth endpoints themselves just means the credentials were wrong — that
    // must not clear state or fire the session-expiry handler, which would
    // redirect away from the login page and lose its ?next= destination.
    if (kind === "unauthorized" && auth) {
      tokenStore.clear();
      unauthorizedListeners.forEach((listener) => listener());
    }

    // An HTML body carries no usable message (and may be a stack trace) —
    // never surface it to the user.
    const message =
      (isHtml ? null : extractMessage(data)) ?? FALLBACK_MESSAGE[kind];

    throw new ApiError(message, response.status, kind, isHtml);
  }

  return data as T;
}

/* ------------------------------------------------------------------ *
 * Envelope normalization
 * ------------------------------------------------------------------ */

/** Unwraps the `{ success, message, data }` envelope used by student reads. */
export async function requestEnveloped<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  const payload = await request<{ success: boolean; message: string; data: T }>(
    path,
    options,
  );
  return payload.data;
}

/** Unwraps the `{ message, <key> }` envelope used by student writes. */
export async function requestKeyed<T>(
  path: string,
  key: string,
  options?: RequestOptions,
): Promise<T> {
  const payload = await request<Record<string, unknown>>(path, options);
  return payload?.[key] as T;
}

/** Turns any thrown value into something safe to show a user. */
export function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong.";
}

export { BASE_URL };
