"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ErrorState, LoadingState } from "@/components/ui";

/**
 * Entry point: send people to the dashboard or to login once auth resolves.
 * Nothing renders in between, so there is no flash of either state.
 */
export default function HomePage() {
  const { status, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading" || status === "unavailable") return;
    router.replace(status === "authed" ? "/dashboard" : "/login");
  }, [status, router]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      {status === "unavailable" ? (
        <ErrorState
          message="We couldn't reach the server to check your session."
          onRetry={retry}
        />
      ) : (
        <LoadingState label="Starting CampusHub…" />
      )}
    </main>
  );
}
