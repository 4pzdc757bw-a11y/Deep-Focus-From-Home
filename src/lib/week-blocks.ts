/**
 * This week's focus blocks are saved as one line of text each (This week page,
 * Weekly planner): "Mon 11:30 AM–1:00 PM · hardest task". Getting started
 * builds that line from day/time pickers and reads it back the same way.
 */
import {
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  blockDefaults,
  clock12,
  endLabel,
  normalizeWorkDays,
  parseWorkHours,
  snapClock,
  toClock as clock,
  weekdayOf,
} from "./work-hours.ts";
import { MAX_DAY_BLOCKS } from "./block-plan.ts";

export type WeekBlockDraft = {
  /** 0 = Sunday … 6 = Saturday. */
  day: number;
  /** "HH:MM" 24-hour. */
  start: string;
  end: string;
  task: string;
};

export function formatWeekBlock(b: WeekBlockDraft): string {
  const day = WEEKDAY_SHORT[b.day] ?? "";
  // Night shift: "Mon 11:00 PM–12:30 AM (next day)" — the day is the shift's start day.
  const times = b.start && b.end ? `${clock12(b.start)}–${endLabel(b.start, b.end)}` : "";
  const head = [day, times].filter(Boolean).join(" ");
  const task = b.task.trim();
  return task ? `${head} · ${task}` : head;
}

const DAY_RE = /^\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s*/i;

/** Best-effort read of a saved line; null when it has no day we recognise. */
export function parseWeekBlock(text: string | undefined | null): WeekBlockDraft | null {
  const raw = (text ?? "").trim();
  const dm = DAY_RE.exec(raw);
  if (!dm) return null;
  const day = WEEKDAY_SHORT.findIndex((d) => d.toLowerCase() === dm[1]!.toLowerCase());
  let rest = raw.slice(dm[0].length);
  let task = "";
  const sep = rest.search(/\s[·|-]\s|\s·|·/);
  if (sep >= 0) {
    task = rest.slice(sep).replace(/^\s*[·|-]\s*/, "").trim();
    rest = rest.slice(0, sep);
  }
  const hours = parseWorkHours(rest.replace(/\(next day\)/gi, " "));
  return {
    day,
    start: hours ? clock(hours.start) : "",
    end: hours?.stop != null ? clock(hours.stop) : "",
    task,
  };
}

/** Times read back from a saved line, or null if it has none (free text). */
export function parseWeekBlockTimes(text: string | undefined | null): WeekBlockDraft | null {
  const b = parseWeekBlock(text);
  if (!b || b.day < 0 || !b.start) return null;
  // No readable end (or equal to the start): 90 min, never zero length.
  return { ...b, ...fixLength({ start: b.start, end: b.end || b.start }) };
}

type SuggestSlot = { start: string; end: string; started?: boolean; auto?: boolean };

const SUGGEST_LOOKBACK_DAYS = 21;

/**
 * Starting blocks for a week plan, from what the user actually uses:
 * 1. their most recent other week plan (same days and times, tasks cleared);
 * 2. else recent Today pages (each work day's Block 1 time, up to 4 days);
 * 3. else two blocks at the start of their work hours (9:00 AM if none set),
 *    on their first and third work days.
 * Dates are work days, so a night shift's block is on the day it starts.
 */
export function suggestWeekBlocks(opts: {
  targetKey: string;
  weeks: Record<string, { blocks: readonly string[] } | undefined>;
  dailies: Record<string, { slots: readonly SuggestSlot[] } | undefined>;
  hours: string | undefined | null;
  workDays?: readonly number[] | null;
  today?: string;
}): WeekBlockDraft[] {
  const { targetKey, weeks, dailies, hours } = opts;
  // 1. Most recent other week plan with readable blocks.
  const weekKeys = Object.keys(weeks)
    .filter((k) => k !== targetKey && k <= (opts.today ?? targetKey))
    .sort()
    .reverse();
  for (const k of weekKeys) {
    const parsed = (weeks[k]?.blocks ?? []).map(parseWeekBlockTimes).filter(Boolean) as WeekBlockDraft[];
    if (parsed.length) return parsed.slice(0, 4).map((b) => ({ ...b, ...fixLength(b), task: "" }));
  }
  // 2. Recent Today pages: Block 1 per work day. Planned times as typed; a
  // block that ran or that the app moved to "now" uses the work-day default
  // (the start of their work hours) instead of that day's one-off clock time.
  const today = opts.today ?? targetKey;
  const cutoff = shiftKey(today, -SUGGEST_LOOKBACK_DAYS);
  const byDay = new Map<number, WeekBlockDraft>();
  for (const date of Object.keys(dailies).filter((d) => d >= cutoff && d <= today).sort().reverse()) {
    const slot = dailies[date]?.slots?.[0];
    if (!slot?.start || !slot.end) continue;
    const day = weekdayOf(date);
    if (byDay.has(day)) continue;
    const oneOff = slot.started || slot.auto;
    const def = blockDefaults(0, hours);
    const start = snapClock(oneOff ? def.start : slot.start);
    const end = oneOff ? snapClock(def.end) : snapClock(slot.end);
    byDay.set(day, { day, ...fixLength({ start, end }), task: "" });
    if (byDay.size >= 4) break;
  }
  if (byDay.size) {
    return WEEKDAY_ORDER.filter((d) => byDay.has(d)).map((d) => byDay.get(d)!);
  }
  // 3. Work hours (or 9:00 AM) on the first and third work days.
  const ordered = WEEKDAY_ORDER.filter((d) => normalizeWorkDays(opts.workDays).includes(d));
  const a = ordered[0] ?? 1;
  const b = ordered[Math.min(2, ordered.length - 1)] ?? 3;
  const def = blockDefaults(0, hours);
  return [...new Set([a, b])].map((day) => ({
    day,
    start: snapClock(def.start),
    end: snapClock(def.end),
    task: "",
  }));
}

function fixLength(b: { start: string; end: string }) {
  if (b.start !== b.end) return { start: b.start, end: b.end };
  const [h, m] = b.start.split(":").map(Number);
  return { start: b.start, end: clock((h ?? 0) * 60 + (m ?? 0) + 90) };
}

function shiftKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Monday (YYYY-MM-DD) of the week holding `dateKey`, like utils.weekKey. */
export function mondayOf(dateKey: string) {
  const day = weekdayOf(dateKey);
  return shiftKey(dateKey, day === 0 ? -6 : 1 - day);
}

/**
 * Blocks the week plan puts on work day `date` (its weekday; for a night shift
 * the shift's start day), in plan order, at most 8 (the Daily OS limit). App-filled, so a block
 * that would end when it starts gets 90 min.
 */
export function planSlotsFor(
  date: string,
  weeks: Record<string, { blocks: readonly string[] } | undefined>,
): { start: string; end: string; task: string }[] {
  const day = weekdayOf(date);
  const lines = weeks[mondayOf(date)]?.blocks ?? [];
  return lines
    .map(parseWeekBlockTimes)
    .filter((b): b is WeekBlockDraft => Boolean(b && b.day === day))
    .slice(0, MAX_DAY_BLOCKS)
    .map((b) => ({ ...fixLength(b), task: b.task }));
}
