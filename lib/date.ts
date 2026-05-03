import { format, parseISO, addDays, subDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const DEFAULT_TZ = "America/New_York";

/**
 * The user's "logical today" — accounts for late-night logging.
 * Before 4 AM local time, "today" still means yesterday's calendar date.
 * Used only for the initial default of /today; the date picker overrides this.
 */
export function getLogicalToday(timezone: string = DEFAULT_TZ): string {
  const now = new Date();
  const localHour = parseInt(formatInTimeZone(now, timezone, "H"), 10);
  const localDate = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  if (localHour < 4) {
    const prev = subDays(parseISO(localDate), 1);
    return format(prev, "yyyy-MM-dd");
  }
  return localDate;
}

/** The user's actual calendar date, ignoring the 4 AM rule. */
export function getCalendarToday(timezone: string = DEFAULT_TZ): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function shiftDate(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), "yyyy-MM-dd");
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

export function prettyDate(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d");
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

export function longDate(iso: string): string {
  return format(parseISO(iso), "EEEE, MMMM d, yyyy");
}

export function dateRange(end: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(shiftDate(end, -i));
  return out;
}

export function nowInTz(tz: string): Date {
  return toZonedTime(new Date(), tz);
}
