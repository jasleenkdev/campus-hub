import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          That page doesn&apos;t exist. It may have been moved, or the link may
          be out of date.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
