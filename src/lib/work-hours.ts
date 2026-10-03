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

function toClock(mins: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** "10:00–21:00" (as saved by Household / Getting started) → minutes; null if unset. */
export function parseWorkHours(hours: string | undefined | null) {
  // Also accepts "11:30 AM – 5 PM" / "9am-5pm" typed on the Household page.
  const times = clockMatches(hours ?? "");
  if (!times.length) return null;
  const start = times[0]!;
  const stop = times.length > 1 ? times[1]! : null;
  // Overnight or zero-length hours: keep the start, ignore the stop.
  return { start, stop: stop != null && stop > start ? stop : null };
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
  const prev = prevEnd ? toMinutes(prevEnd) : null;
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
  if (end > 23 * 60 + 59) end = 23 * 60 + 59;
  return { start: toClock(start), end: toClock(end) };
}

/** End for a given start: start + 90 min, kept inside the work day. */
export function endForStart(start: string, hours: string | undefined | null) {
  const s = toMinutes(start);
  if (s == null) return "";
  const stop = parseWorkHours(hours)?.stop ?? null;
  let end = s + BLOCK_MINUTES;
  if (stop != null && s < stop && end > stop) end = stop;
  if (end > 23 * 60 + 59) return "";
  return toClock(end);
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
