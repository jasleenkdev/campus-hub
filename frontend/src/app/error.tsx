"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Catches render-time errors anywhere in the tree so a crash shows a usable
 * screen rather than Next's default error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600 dark:bg-red-950 dark:text-red-400"
        >
          !
        </span>
        <h1 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The page failed to render. Trying again often clears it.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/dashboard")}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
