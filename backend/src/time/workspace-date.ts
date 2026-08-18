import { formatInTimeZone } from "date-fns-tz";

/**
 * Calendar day of `instant` in a workspace IANA zone (`YYYY-MM-DD`).
 * Standup uniqueness is per member, workspace, and this local date — not UTC.
 */
export function calendarDateInZone(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}
