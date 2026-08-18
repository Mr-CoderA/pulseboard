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
