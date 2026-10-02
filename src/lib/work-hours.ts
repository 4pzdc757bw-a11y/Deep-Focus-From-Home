/** Work-hours helpers: default Daily OS block times follow the user's work day. */

export const BLOCK_MINUTES = 90;
const GAP_MINUTES = 30;
const FALLBACK_START = "09:00";

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function toClock(mins: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/** "10:00–21:00" (as saved by Household / Getting started) → minutes; null if unset. */
export function parseWorkHours(hours: string | undefined | null) {
  const m = (hours ?? "").match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
  if (!m) return null;
  const start = toMinutes(m[1]);
  const stop = toMinutes(m[2]);
  if (start == null) return null;
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
