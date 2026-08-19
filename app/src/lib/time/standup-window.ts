import { isMondayUtc, weekStartSchema } from "@pulseboard/types";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/** Inclusive local-hour window during which a standup may be filed. */
export const STANDUP_WINDOW = {
  startHour: 8,
  endHour: 11,
} as const;

export interface WorkspaceClock {
  readonly timezone: string;
  readonly isoDate: string;
  readonly clockLabel: string;
  readonly hour: number;
  readonly windowOpen: boolean;
}

export function workspaceClock(timezone: string, now: Date): WorkspaceClock {
  const zoned = toZonedTime(now, timezone);
  const hour = zoned.getHours();
  return {
    timezone,
    isoDate: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
    clockLabel: formatInTimeZone(now, timezone, "HH:mm zzz"),
    hour,
    windowOpen: hour >= STANDUP_WINDOW.startHour && hour < STANDUP_WINDOW.endHour,
  };
}

export function workspaceLocalToday(timezone: string, now: Date): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error("isoDate must be YYYY-MM-DD");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const yyyy = String(utc.getUTCFullYear()).padStart(4, "0");
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function standupDateRange(from: string, to: string): string {
  return `${from}/${to}`;
}

export function dashboardStandupRange(timezone: string, now: Date, lookbackDays = 14): string {
  const today = workspaceLocalToday(timezone, now);
  return standupDateRange(shiftIsoDate(today, -lookbackDays), today);
}

/** UTC calendar Monday of the week containing `now`, validated as digest `weekStart`. */
export function utcMondayWeekStart(now: Date): string {
  const utcDay = now.getUTCDay();
  const offset = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset),
  );
  const yyyy = String(monday.getUTCFullYear()).padStart(4, "0");
  const mm = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(monday.getUTCDate()).padStart(2, "0");
  const iso = `${yyyy}-${mm}-${dd}`;
  if (!isMondayUtc(iso)) {
    throw new Error("weekStart must be a Monday (UTC calendar date)");
  }
  return weekStartSchema.parse(iso);
}

export function formatWorkspaceDate(isoDate: string, timezone: string): string {
  const noonUtc = new Date(`${isoDate}T12:00:00.000Z`);
  return formatInTimeZone(noonUtc, timezone, "EEE dd MMM yyyy");
}

export function formatWorkspaceTimestamp(isoDateTime: string, timezone: string): string {
  return formatInTimeZone(isoDateTime, timezone, "dd MMM yyyy HH:mm zzz");
}

export function windowCopy(clock: WorkspaceClock): string {
  const start = String(STANDUP_WINDOW.startHour).padStart(2, "0");
  const end = String(STANDUP_WINDOW.endHour).padStart(2, "0");
  if (clock.windowOpen) {
    return `Window open · ${start}:00–${end}:00 ${clock.timezone}`;
  }
  return `Window closed · next ${start}:00 ${clock.timezone}`;
}
