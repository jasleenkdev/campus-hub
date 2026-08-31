"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { ApiError, onUnauthorized, tokenStore } from "@/api/client";
import * as authApi from "@/api/auth";
import { getProfile } from "@/api/profile";
import type { User } from "@/api/types";

/**
 * `loading`      — we have not yet decided; protected pages must not render.
 * `authed`       — token verified against GET /api/profile this session.
 * `guest`        — no token, or the token was rejected with a 401.
 * `unavailable`  — the token could not be verified for a reason that is NOT a
 *                  rejection (server down, 429, network blip). The token is
 *                  kept and the user is offered a retry: a transient failure
 *                  must not destroy a valid session.
 */
export type AuthStatus = "loading" | "authed" | "guest" | "unavailable";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Re-attempts verification after an `unavailable` result. */
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Where the login page reads the "your session ended" message from. */
export const SESSION_EXPIRED_KEY = "campushub.sessionExpired";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  // Guards against two 401s racing into two redirects.
  const handlingExpiry = useRef(false);

  /**
   * Resolve auth before anything protected renders. A stored token is not
   * trusted on its own — it is verified against the API, so an expired token
   * cannot briefly present as a logged-in session.
   */
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      // Reading localStorage is only possible after mount, so this is a genuine
      // "sync external state into React" case rather than a cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("guest");
      return;
    }

    const controller = new AbortController();
    let active = true;

    getProfile(controller.signal)
      .then((profile) => {
        if (!active) return;
        tokenStore.setCachedUser(profile);
        setUser(profile);
        setStatus("authed");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError") return;

        // Only a rejection ends the session. The client's interceptor has
        // already cleared the token for a 401.
        if (error instanceof ApiError && error.kind === "unauthorized") {
          tokenStore.clear();
          setUser(null);
          setStatus("guest");
          return;
        }

        // Anything else — server down, a 429 from the global rate limiter, a
        // dropped connection — is transient. Keep the token and let the user
        // retry rather than silently logging them out of a valid session.
        setUser(null);
        setStatus("unavailable");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  /** A 401 from any call anywhere ends the session exactly once. */
  useEffect(() => {
    return onUnauthorized(() => {
      if (handlingExpiry.current) return;
      handlingExpiry.current = true;

      setUser(null);
      setStatus("guest");

      try {
        window.sessionStorage.setItem(
          SESSION_EXPIRED_KEY,
          "Your session expired. Please sign in again.",
        );
      } catch {
        /* ignore */
      }

      router.replace("/login");
      window.setTimeout(() => {
        handlingExpiry.current = false;
      }, 1000);
    });
  }, [router]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    setUser(result.user);
    setStatus("authed");
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      // Signup issues no token, so log in immediately afterwards.
      await authApi.signup(name, email, password);
      const result = await authApi.login(email, password);
      setUser(result.user);
      setStatus("authed");
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus("guest");
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ status, user, retry, login, signup, logout }),
    [status, user, retry, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
