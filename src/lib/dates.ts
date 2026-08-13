/**
 * Australia/Sydney date & time helpers.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The warehouse runs on Sydney time, but the server may run anywhere (Vercel
 * defaults to UTC). If we used `new Date()` and the browser/server local zone,
 * the dashboard would roll over to "tomorrow" at the wrong moment and the
 * Christmas countdown would be off by a day for part of each day.
 *
 * Everything here derives Sydney calendar dates from a UTC instant using
 * Intl.DateTimeFormat with an explicit timeZone, which correctly handles
 * NSW daylight saving without any extra dependency.
 *
 * Calendar dates are passed around as "YYYY-MM-DD" strings ("date keys") and
 * times as "HH:mm" (24-hour). They are never converted to Date objects for
 * storage — see the note in prisma/schema.prisma.
 */

export const SYDNEY_TIME_ZONE = "Australia/Sydney";

/** A calendar date with no time or zone attached. */
export type DateParts = { year: number; month: number; day: number };

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SYDNEY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const WEEKDAY_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * The Sydney calendar date for a given instant, as "YYYY-MM-DD".
 * `en-CA` formats as YYYY-MM-DD, which is exactly the shape we store.
 */
export function toSydneyDateKey(instant: Date = new Date()): string {
  return dateKeyFormatter.format(instant);
}

/** Today's Sydney calendar date as "YYYY-MM-DD". */
export function todaySydneyDateKey(): string {
  return toSydneyDateKey(new Date());
}

/** True if the string is a well-formed, real calendar date key. */
export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const { year, month, day } = parseDateKey(value);
  if (month < 1 || month > 12 || day < 1) return false;
  // Rejects 31 February etc. Date.UTC normalises overflow, so compare back.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** True if the string is a well-formed 24-hour "HH:mm" time. */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Split "YYYY-MM-DD" into numeric parts. */
export function parseDateKey(dateKey: string): DateParts {
  const [year, month, day] = dateKey.split("-").map(Number);
  return { year, month, day };
}

/**
 * Days between two calendar dates, ignoring time zones entirely.
 * Both dates are anchored at UTC midnight so DST can never contribute a
 * partial day — the result is always a whole number.
 */
export function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/**
 * Sleeps until Christmas Day, counted from a Sydney calendar date.
 *
 * Behaviour around Christmas:
 *   24 Dec -> 1   ("one more sleep")
 *   25 Dec -> 0   (callers render this as "IT'S CHRISTMAS DAY")
 *   26 Dec -> rolls over to next year's Christmas (364 or 365)
 */
export function sleepsUntilChristmas(dateKey: string = todaySydneyDateKey()): number {
  const { year } = parseDateKey(dateKey);
  const thisYearChristmas = `${year}-12-25`;
  const diff = daysBetweenDateKeys(dateKey, thisYearChristmas);
  if (diff >= 0) return diff;
  // Boxing Day onwards — count to next year's Christmas.
  return daysBetweenDateKeys(dateKey, `${year + 1}-12-25`);
}

/** Weekday name for a calendar date, e.g. "THURSDAY". */
export function weekdayName(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  // Anchored at UTC midnight and read back in UTC — no zone shift possible.
  return WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** "THURSDAY 13 AUGUST 2026" — the full header date. */
export function formatFullDate(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  return `${weekdayName(dateKey)} ${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** "13 AUGUST" — the short batch date used on the big panels. */
export function formatBatchDate(dateKey: string): string {
  const { month, day } = parseDateKey(dateKey);
  return `${day} ${MONTH_NAMES[month - 1]}`;
}

/** "13 Aug 2026" — compact form for the history table. */
export function formatShortDate(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  const short = MONTH_NAMES[month - 1].charAt(0) + MONTH_NAMES[month - 1].slice(1, 3).toLowerCase();
  return `${day} ${short} ${year}`;
}

/** "14:30" -> "2:30 PM". Returns null for missing/invalid input. */
export function formatTime(time: string | null | undefined): string | null {
  if (!time || !isValidTime(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** An instant rendered as Sydney wall-clock time, e.g. "8:07 AM". */
export function formatSydneyTime(instant: Date): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(instant)
    .toUpperCase()
    // en-AU renders "am"/"pm" (sometimes with narrow no-break spaces) — normalise.
    .replace(/ | /g, " ");
}

/** Minutes since midnight for an "HH:mm" string. Null if invalid/missing. */
export function minutesFromTime(time: string | null | undefined): number | null {
  if (!time || !isValidTime(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SYDNEY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Minutes since midnight *in Sydney* for an instant.
 *
 * Used to work out how far through the working day we are. Read from the
 * formatted Sydney clock rather than from the server's own clock, so the pace
 * calculation is correct on a UTC host.
 */
export function sydneyMinutesOfDay(instant: Date = new Date()): number {
  const [hours, minutes] = clockFormatter.format(instant).split(":").map(Number);
  return hours * 60 + minutes;
}

/** Shift a calendar date by whole days, returning a new "YYYY-MM-DD" key. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const { year, month, day } = parseDateKey(dateKey);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
