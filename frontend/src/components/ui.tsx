"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* -------------------------------------------------------------- Buttons */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 " +
  "disabled:cursor-not-allowed disabled:opacity-55";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 text-white shadow-sm hover:bg-sky-700 active:bg-sky-800",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 " +
    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  ghost:
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};

export function Button({
  variant = "primary",
  className = "",
  loading = false,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      {...props}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------- Inputs */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-sky-500 focus:outline-2 focus:outline-offset-0 " +
  "focus:outline-sky-500/40 disabled:bg-slate-50 disabled:text-slate-500 " +
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROL} ${className}`} />;
}

export function Textarea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${CONTROL} ${className}`} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROL} ${className}`} />;
}

/* -------------------------------------------------------------- Surfaces */

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- States */

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-slate-500"
    >
      <Spinner className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-medium text-slate-800 dark:text-slate-100">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-red-50 text-lg font-bold text-red-600 dark:bg-red-950 dark:text-red-400"
      >
        !
      </span>
      <p className="max-w-md text-sm text-slate-700 dark:text-slate-200">
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "info";
  children: ReactNode;
}) {
  const tones = {
    neutral:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
