"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ErrorState, LoadingState } from "@/components/ui";
import { AppShell } from "@/components/app-shell";

/**
 * The auth gate for every protected page.
 *
 * Children render only once status === "authed", so protected content never
 * flashes before the session is confirmed. The redirect is one-way (this group
 * → /login) and /login redirects back only when authed, so no loop is possible.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "guest") return;
    // Remember where they were headed so login can send them back.
    const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [status, pathname, router]);

  if (status === "unavailable") {
    // The session may well be fine — we just could not confirm it. Offer a
    // retry instead of dumping the user at the login screen.
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <ErrorState
          message="We couldn't confirm your session — the server didn't respond. Your sign-in may still be valid."
          onRetry={retry}
        />
      </div>
    );
  }

  if (status !== "authed") {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState
          label={status === "loading" ? "Checking your session…" : "Redirecting…"}
        />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
