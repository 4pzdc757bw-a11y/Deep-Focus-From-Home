/** Work-hours helpers: default Daily OS block times follow the user's work day. */

export const BLOCK_MINUTES = 90;
const GAP_MINUTES = 30;
const FALLBACK_START = "09:00";

export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** One clock time in free text: "11:30", "11:30 AM", "9am", "5 pm". */
const CLOCK_RE = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;

function clockMatches(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CLOCK_RE)) {
    const hasMinutes = m[2] != null;
    const ampm = m[3]?.toLowerCase().replace(/\./g, "");
    // A bare number with no minutes and no am/pm is not a time ("2 blocks").
    if (!hasMinutes && !ampm) continue;
    let h = Number(m[1]);
    const min = hasMinutes ? Number(m[2]) : 0;
    if (min > 59) continue;
    if (ampm) {
      if (h < 1 || h > 12) continue;
      if (ampm === "pm" && h !== 12) h += 12;
      if (ampm === "am" && h === 12) h = 0;
    } else if (h > 23) continue;
    out.push(h * 60 + min);
  }
  return out;
}

const DAY = 24 * 60;

/** Minutes → "HH:MM" on the clock. Minutes past midnight wrap (25:30 → 01:30). */
export function toClock(mins: number) {
  const m = ((Math.round(mins) % DAY) + DAY) % DAY;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export type WorkHours = {
  /** Start of the work day, minutes after midnight (0–1439). */
  start: number;
  /**
   * End of the work day in minutes after the START DAY's midnight, so it is
   * always later than `start`. Overnight hours (11 PM–7 AM) give 1860
   * (7:00 the next morning). Null when no stop time is set.
   */
  stop: number | null;
  /** True when the work day runs past midnight (stop is next morning). */
  overnight: boolean;
};

/** "10:00–21:00" (as saved by Household / Getting started) → minutes; null if unset. */
export function parseWorkHours(hours: string | undefined | null): WorkHours | null {
  // Also accepts "11:30 AM – 5 PM" / "9am-5pm" / "11 PM – 7 AM" typed on the Household page.
  const times = clockMatches(hours ?? "");
  if (!times.length) return null;
  const start = times[0]!;
  const raw = times.length > 1 ? times[1]! : null;
  // Same start and stop: treat as no stop. Stop earlier than start: overnight shift.
  if (raw == null || raw === start) return { start, stop: null, overnight: false };
  if (raw < start) return { start, stop: raw + DAY, overnight: true };
  return { start, stop: raw, overnight: false };
}

/**
 * A clock time on the work day's own timeline (minutes after the start day's
 * midnight). For overnight hours, times before the start belong to the next
 * morning (01:30 → 1530); otherwise it is just the clock minutes.
 */
export function workMinutes(hhmm: string, hours: string | undefined | null): number | null {
  const m = toMinutes(hhmm);
  if (m == null) return null;
  const wh = parseWorkHours(hours);
  if (wh?.overnight && m < wh.start) return m + DAY;
  return m;
}

/** Minutes from start to end, wrapping past midnight (23:00 → 00:30 = 90). Null if unreadable. */
export function spanMinutes(start: string, end: string): number | null {
  const a = toMinutes(start);
  const b = toMinutes(end);
  if (a == null || b == null) return null;
  return b > a ? b - a : b + DAY - a;
}

/** End is earlier on the clock than start, so it falls on the next calendar day. */
export function endsNextDay(start: string, end: string) {
  const a = toMinutes(start);
  const b = toMinutes(end);
  return a != null && b != null && b < a;
}

/**
 * Default start/end for Daily OS block `index` (0-based).
 * Block 1 starts when the work day starts; each later block starts 30 min after
 * the previous block's end (or 2 h after the previous default). Everything is
 * kept inside the work hours when they are set.
 */
export function blockDefaults(
  index: number,
  hours: string | undefined | null,
  prevEnd?: string,
): { start: string; end: string } {
  const wh = parseWorkHours(hours);
  const dayStart = wh?.start ?? (toMinutes(FALLBACK_START) as number);
  const dayStop = wh?.stop ?? null;
  // Previous block's end on the work day's timeline (past midnight for night shifts).
  const prev = prevEnd ? workMinutes(prevEnd, hours) : null;
  let start =
    index > 0 && prev != null
      ? prev + GAP_MINUTES
      : dayStart + index * (BLOCK_MINUTES + GAP_MINUTES);
  if (start < dayStart) start = dayStart;
  let end = start + BLOCK_MINUTES;
  if (dayStop != null) {
    if (end > dayStop) end = dayStop;
    if (end - start < 15) {
      // No room left: fit the last block of the day before the stop time.
      start = Math.max(dayStart, dayStop - BLOCK_MINUTES);
      end = dayStop;
    }
  }
  return { start: toClock(start), end: toClock(end) };
}

/**
 * End for a given start: start + 90 min, kept inside the work day. May be
 * after midnight (23:00 → "00:30"); use endsNextDay() to label it.
 */
export function endForStart(start: string, hours: string | undefined | null) {
  const s = workMinutes(start, hours);
  if (s == null) return "";
  const stop = parseWorkHours(hours)?.stop ?? null;
  let end = s + BLOCK_MINUTES;
  if (stop != null && s < stop && end > stop) end = stop;
  return toClock(end);
}

/** "00:30" after a "23:00" start → "12:30 AM (next day)"; otherwise clock12. */
export function endLabel(start: string, end: string) {
  return endsNextDay(start, end) ? `${clock12(end)} (next day)` : clock12(end);
}

/**
 * Picker choices in `step`-minute steps on the work day's timeline:
 * starts from the work start up to the last slot before the stop; ends from
 * just after the start up to the stop (past midnight for night shifts).
 * No work hours → 6 AM–10 PM, ends up to 4 h after the start.
 */
export function blockTimeOptions(
  hours: string | undefined | null,
  kind: "start" | "end",
  start?: string,
  step = 15,
): string[] {
  const wh = parseWorkHours(hours);
  const lo = wh?.start ?? 6 * 60;
  const hi = wh?.stop ?? Math.max(22 * 60, lo + 8 * 60);
  const out: string[] = [];
  if (kind === "start") {
    for (let m = Math.ceil(lo / step) * step; m <= hi; m += step) out.push(toClock(m));
    return out;
  }
  const s = start ? workMinutes(start, hours) : null;
  const from = s != null ? s + step : lo + step;
  // A start at (or after) the stop still gets a normal 90-minute choice.
  const to = s != null && s >= hi ? s + BLOCK_MINUTES : hi;
  for (let m = Math.ceil(from / step) * step; m <= to; m += step) out.push(toClock(m));
  return out;
}

/**
 * Which calendar day a moment belongs to as a WORK DAY. Daytime hours: the
 * calendar date. Overnight hours (e.g. 11 PM–7 AM): the small hours belong to
 * the shift that started the evening before, until halfway between the stop
 * and the next start (7 AM–11 PM → until 3 PM). So Mon 11 PM – Tue 7 AM is
 * Monday's work day.
 */
export function workdayKey(now: Date, hours: string | undefined | null) {
  const wh = parseWorkHours(hours);
  const key = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  if (!wh?.overnight || wh.stop == null) return key(now);
  const stopClock = wh.stop - DAY;
  const cutoff = stopClock + (wh.start - stopClock) / 2;
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < cutoff) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return key(prev);
  }
  return key(now);
}

/** "10:00" → "10:00", "09:30" → "9:30" — short label for placeholders. */
export function shortClock(hhmm: string) {
  return hhmm.replace(/^0(\d)/, "$1");
}

/** "13:30" → "1:30 PM" — friendly label for time pickers. */
export function clock12(hhmm: string) {
  const mins = toMinutes(hhmm);
  if (mins == null) return hhmm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Every time of day in `step`-minute steps, as "HH:MM" (for selects). */
export function timeOptions(step = 15): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += step) out.push(toClock(m));
  return out;
}

/** Snap "HH:MM" to the nearest `step` minutes (kept inside the day). */
export function snapClock(hhmm: string, step = 15) {
  const mins = toMinutes(hhmm);
  if (mins == null) return hhmm;
  return toClock(Math.min(24 * 60 - step, Math.round(mins / step) * step));
}

/* ---------- Work days ---------- */

/** 0 = Sunday … 6 = Saturday. Monday–Friday when the user has not picked any. */
export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5] as const;

/** Weekdays first, then the weekend (display order for day pickers). */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function normalizeWorkDays(days: readonly number[] | undefined | null): number[] {
  const valid = [...new Set((days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  return valid.length ? valid.sort((a, b) => a - b) : [...DEFAULT_WORK_DAYS];
}

function weekdayOf(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay();
}

function addDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** First work day strictly after `dateKey` (YYYY-MM-DD). */
export function nextWorkday(dateKey: string, workDays?: readonly number[] | null) {
  const days = normalizeWorkDays(workDays);
  for (let i = 1; i <= 7; i++) {
    const next = addDays(dateKey, i);
    if (days.includes(weekdayOf(next))) return next;
  }
  return addDays(dateKey, 1);
}

/**
 * Daily OS date to open after closing (or skipping) `dateKey`: the next work
 * day, but never earlier than `today`, so it never jumps backward.
 */
export function nextWorkdayFrom(
  dateKey: string,
  today: string,
  workDays?: readonly number[] | null,
) {
  const next = nextWorkday(dateKey, workDays);
  return next > today ? next : today;
}

/* ---------- Starter week dates ---------- */

/**
 * Dates (YYYY-MM-DD) of starter Days 1–7. Day 1 is the start date (the day
 * they began, even if it is not a picked work day); Days 2–7 fall on the next
 * picked work days (Mon–Fri if none picked), skipping days off. Dates are work
 * days, so for a night shift they are the days each shift starts.
 */
export function starterDayDates(start: string, workDays?: readonly number[] | null): string[] {
  const out = [start];
  while (out.length < 7) out.push(nextWorkday(out[out.length - 1]!, workDays));
  return out;
}

/** Date of starter day `day` (1–7). */
export function starterDayDate(start: string, day: number, workDays?: readonly number[] | null) {
  return starterDayDates(start, workDays)[Math.min(7, Math.max(1, day)) - 1]!;
}

/** Starter day 1–7 that falls on `date`, or null. */
export function starterDayOn(start: string | null, date: string, workDays?: readonly number[] | null) {
  if (!start) return null;
  const i = starterDayDates(start, workDays).indexOf(date);
  return i >= 0 ? i + 1 : null;
}
