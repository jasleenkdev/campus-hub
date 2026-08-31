/**
 * Event dates are stored from date-only input and land at T00:00:00.000Z, so
 * they must be read in UTC — formatting them locally shifts them a day earlier
 * for anyone west of Greenwich.
 */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Announcement dates are real instants (Date.now), so local time is correct. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** True when an event's date is today (UTC) or later. */
export function isUpcoming(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return date.getTime() >= todayUtc;
}

/** "4 years" / "1 year" for a course duration. */
export function formatDuration(duration: number): string {
  if (typeof duration !== "number" || Number.isNaN(duration)) return "—";
  return `${duration} ${duration === 1 ? "year" : "years"}`;
}

/** Input[type=date] value → what the events API expects. */
export function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}
