// Date utilities to keep date displays consistent regardless of server/viewer
// timezone. Date-only fields (issueDate, dueDate, paidAt) are stored as UTC
// midnight; format them with timeZone: 'UTC' so they always show the same date.

/**
 * Returns YYYY-MM-DD string using LOCAL date components (not UTC).
 * Use for HTML date inputs to avoid timezone-shifted defaults near midnight.
 */
export function localDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a date for display, treating it as UTC so the displayed date matches
 * the date that was originally stored, regardless of viewer's timezone.
 * Use for date-only fields like issueDate, dueDate, paidAt.
 */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { timeZone: "UTC" });
}

/**
 * Returns YYYY-MM-DD string in UTC (extracts the UTC date portion).
 * Use for HTML date inputs when the source date is a UTC-midnight stored value.
 */
export function utcDateString(d: Date | string): string {
  const date = new Date(d);
  return date.toISOString().split("T")[0];
}
