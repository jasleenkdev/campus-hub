"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, toMessage } from "@/api/client";
import { Button, Card, Field, Input, LoadingState } from "@/components/ui";

export default function SignupPage() {
  const { status, signup } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authed") router.replace("/dashboard");
  }, [status, router]);

  if (status === "loading" || status === "authed") {
    return (
      <main className="grid min-h-screen place-items-center">
        <LoadingState label="Checking your session…" />
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Name, email and password are all required.");
      return;
    }

    setSubmitting(true);
    try {
      // signup() also logs in — the backend issues no token on signup.
      await signup(name.trim(), email.trim(), password);
      router.replace("/dashboard");
    } catch (caught) {
      if (caught instanceof ApiError && caught.kind === "conflict") {
        setError("An account with that email already exists.");
      } else if (caught instanceof ApiError && caught.kind === "rateLimited") {
        setError("Too many attempts. Wait a few minutes and try again.");
      } else {
        setError(toMessage(caught));
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CampusHub</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create your account
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field label="Name">
              <Input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                placeholder="Jane Doe"
                required
              />
            </Field>

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
                autoComplete="new-password"
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
              {submitting ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
