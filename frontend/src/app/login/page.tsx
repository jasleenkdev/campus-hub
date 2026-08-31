"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth, SESSION_EXPIRED_KEY } from "@/lib/auth-context";
import { ApiError, toMessage } from "@/api/client";
import { Button, Card, Field, Input, LoadingState } from "@/components/ui";

function LoginForm() {
  const { status, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const next = searchParams.get("next");

  // Message handed over by the 401 interceptor, shown once.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SESSION_EXPIRED_KEY);
      if (stored) {
        // sessionStorage is unavailable during render; reading it on mount is
        // the intended use of an effect here.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNotice(stored);
        window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Already signed in? Don't show the form at all.
  useEffect(() => {
    if (status === "authed") router.replace(next || "/dashboard");
  }, [status, next, router]);

  if (status === "loading" || status === "authed") {
    return <LoadingState label="Checking your session…" />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(next || "/dashboard");
    } catch (caught) {
      // 429 matters here: the backend allows only 10 auth attempts / 15 min.
      if (caught instanceof ApiError && caught.kind === "rateLimited") {
        setError("Too many sign-in attempts. Wait a few minutes and try again.");
      } else {
        setError(toMessage(caught));
      }
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {notice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-100">
          {notice}
        </p>
      )}

      <Field label="Email">
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          placeholder="you@campus.edu"
          required
        />
      </Field>

      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          placeholder="••••••••"
          required
        />
      </Field>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CampusHub</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in to continue
          </p>
        </div>
        <Card className="p-6">
          <Suspense fallback={<LoadingState />}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
