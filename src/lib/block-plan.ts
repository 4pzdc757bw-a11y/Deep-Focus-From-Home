import { durationMinutes, stampClockNow } from "./chime.ts";
import { blockDefaults, parseWorkHours, spanMinutes, toClock, toMinutes, workMinutes } from "./work-hours.ts";

const DEFAULT_BLOCK_MINUTES = 90;
/** Shortest app-filled block when 90 min would run past the work-day stop. */
const MIN_FIT_MINUTES = 60;

/** Blocks on a Daily OS page: a new day shows 4; Add goes up to 8, Remove down to 1. */
export const MIN_DAY_BLOCKS = 1;
export const DEFAULT_DAY_BLOCKS = 4;
export const MAX_DAY_BLOCKS = 8;
/** Saved on each day by the 4–8 block page (older days have no marker). */
export const DAY_BLOCKS_LAYOUT = 2;

/** A whole number of blocks inside 1–8 (anything unreadable → `fallback`). */
export function clampBlockCount(n: unknown, fallback = DEFAULT_DAY_BLOCKS): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(MAX_DAY_BLOCKS, Math.max(MIN_DAY_BLOCKS, v));
}
const MAX_BLOCK_MINUTES = 4 * 60;

/** Planned length from the block's prefilled/typed times (may cross midnight); 90 min if unusable. */
export function plannedMinutes(start: string, end: string) {
  if (!start || !end || end === start) return DEFAULT_BLOCK_MINUTES;
  const mins = durationMinutes(start, end);
  if (mins == null || mins < 5 || mins > MAX_BLOCK_MINUTES) return DEFAULT_BLOCK_MINUTES;
  return mins;
}

/**
 * When Start is pressed: stamp start = now. Keep the planned end if it is
 * still ahead (later today, or after midnight for a block that crosses it,
 * up to 4 h away); otherwise end = now + planned length. The bell time is a
 * real timestamp, so a block from 11:00 PM to 12:30 AM rings at 12:30 AM.
 */
export function startPlan(slot: { start: string; end: string }, now = new Date()) {
  const start = stampClockNow(now);
  const planned = plannedMinutes(slot.start, slot.end);
  if (slot.end) {
    const [h, m] = slot.end.split(":").map(Number);
    const endAt = new Date(now);
    endAt.setHours(h ?? 0, m ?? 0, 0, 0);
    // Still later today (as before), or just after midnight for a block that crosses it.
    let ahead = endAt.getTime() - now.getTime();
    if (ahead < 60_000) {
      endAt.setDate(endAt.getDate() + 1);
      ahead = endAt.getTime() - now.getTime();
      if (ahead > MAX_BLOCK_MINUTES * 60_000) ahead = -1;
    }
    // Keep it only if it is no further away than the planned length (starting
    // before a planned start never makes the block longer).
    if (ahead >= 60_000 && ahead <= (planned + 1) * 60_000) {
      return { start, end: slot.end, endsAt: endAt.getTime() };
    }
  }
  const endsAt = now.getTime() + planned * 60_000;
  return { start, end: stampClockNow(new Date(endsAt)), endsAt };
}


const GAP_MINUTES = 30;
/** Break after a block that actually ran (its end is the real end). */
const GAP_AFTER_RUN = 15;
const DAY = 24 * 60;

/** Round minutes up to the next quarter hour (3:52 → 4:00, 4:00 stays). */
export function ceilQuarter(mins: number) {
  return Math.ceil(mins / 15) * 15;
}

type PlanSlot = { start: string; end: string; started?: boolean; edited?: boolean; auto?: boolean };

/**
 * Opening today's Daily OS late: any not-yet-started block whose planned start
 * has passed moves to the next quarter hour from now (Block 1) or after the
 * block before it (30 min after a planned block, 15 min after one that
 * actually ran, e.g. ended 3:54 → 4:15), rounded up to a quarter hour, keeping its planned length (90 min by
 * default). Blocks still ahead, already rung, or edited by hand stay put;
 * blocks the app moved (`auto`) keep following the block before them.
 * `date` is the work day (YYYY-MM-DD); night-shift times past midnight count
 * as the next calendar day. Ends are kept inside the work hours when there is
 * room. Returns only the blocks that change.
 */
export function catchUpBlocks(
  slots: readonly PlanSlot[],
  count: number,
  date: string,
  hours: string | undefined | null,
  now = new Date(),
): { index: number; start: string; end: string }[] {
  const [y, m, d] = date.split("-").map(Number);
  const midnight = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
  const nowMin = Math.floor((now.getTime() - midnight) / 60_000);
  if (nowMin < 0 || nowMin > 2 * DAY) return [];
  const wh = parseWorkHours(hours);
  const out: { index: number; start: string; end: string }[] = [];
  let prevEnd: number | null = null;
  let prevRan = false;
  for (let i = 0; i < Math.min(count, slots.length); i++) {
    const slot = slots[i]!;
    const start = slot.start ? workMinutes(slot.start, hours) : null;
    if (start == null) continue;
    // App-moved blocks may have been trimmed to the work-day stop: back to 90 min.
    const len = slot.auto ? DEFAULT_BLOCK_MINUTES : plannedMinutes(slot.start, slot.end);
    // A block that ran keeps its real end, however short.
    const ranSpan = slot.started && slot.end ? spanMinutes(slot.start, slot.end) : null;
    let end = start + (ranSpan ?? len);
    const movable = !slot.started && !slot.edited;
    const gap = prevRan ? GAP_AFTER_RUN : GAP_MINUTES;
    const earliest = prevEnd == null ? nowMin : Math.max(nowMin, prevEnd + gap);
    const target = ceilQuarter(earliest);
    // Passed → move. Times the app already moved keep following the block
    // before (e.g. Block 1 ends early → Block 2 comes 15 min after it).
    if (movable && (start < earliest || (slot.auto && prevEnd != null && start !== target))) {
      const newStart = target;
      end = newStart + len;
      const stop = wh?.stop ?? null;
      if (stop != null && end > stop && stop - newStart >= 15) end = stop;
      out.push({ index: i, start: toClock(newStart), end: toClock(end) });
    }
    prevEnd = end;
    prevRan = Boolean(slot.started);
  }
  return out;
}

/**
 * App-filled times never end when they start: an equal (or unreadable) end
 * becomes start + 90 min. Bell-stamped times never go through this.
 */
export function withLength(t: { start: string; end: string }): { start: string; end: string } {
  const a = toMinutes(t.start);
  if (a == null) return t;
  const b = toMinutes(t.end);
  if (b == null || b === a) return { start: t.start, end: toClock(a + DEFAULT_BLOCK_MINUTES) };
  return t;
}

/**
 * Times for a newly added block: 15 min after the previous block's end (or
 * now, if later and the page is today's), rounded up to the quarter hour,
 * 90 min long. With no previous times: the work-day default for that block.
 */
export function nextBlockTimes(
  prev: { start: string; end: string; started?: boolean } | undefined,
  index: number,
  hours: string | undefined | null,
  now: Date | null,
): { start: string; end: string } {
  const prevEnd = prev?.end ? toMinutes(prev.end) : null;
  if (prevEnd == null) return withLength(blockDefaults(index, hours, prev?.end));
  let base = prevEnd + GAP_AFTER_RUN;
  if (now) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    // Minutes since the previous end, across midnight (night shifts).
    const since = (nowMin - prevEnd + DAY) % DAY;
    if (since < 12 * 60) base = Math.max(base, prevEnd + since);
  }
  const start = ceilQuarter(base);
  // Keep it inside the work day when there is room for at least an hour
  // (4:00 PM on a 9–5 day → 4:00–5:00); later blocks stay 90 min.
  let len = DEFAULT_BLOCK_MINUTES;
  const stop = parseWorkHours(hours)?.stop ?? null;
  const onDay = workMinutes(toClock(start), hours);
  if (stop != null && onDay != null && onDay + len > stop && stop - onDay >= MIN_FIT_MINUTES) {
    len = stop - onDay;
  }
  return { start: toClock(start), end: toClock(start + len) };
}

/**
 * Prefilled times for the first `count` blocks of a new day: the given
 * planned blocks (week plan, or Block 1 at the start of the work day), then
 * each next block 15 min after the one before, rounded up to the quarter hour
 * (nextBlockTimes, no clock). Never blank. 9–5: 9:00–10:30, 10:45–12:15,
 * 12:30–2:00, 2:15–3:45.
 */
export function defaultDayTimes(
  count: number,
  hours: string | undefined | null,
  planned: readonly { start: string; end: string }[] = [],
): { start: string; end: string }[] {
  const n = clampBlockCount(count);
  const out: { start: string; end: string }[] = [];
  for (let i = 0; i < n; i++) {
    const p = planned[i];
    if (p?.start) out.push(withLength({ start: p.start, end: p.end || p.start }));
    else if (i === 0) out.push(withLength(blockDefaults(0, hours)));
    else out.push(nextBlockTimes(out[i - 1], i, hours, null));
  }
  return out;
}

/**
 * A new day's times from that weekday's own week plan: the planned blocks in
 * time order. Days with no plan get the 4 default blocks. A planned day with
 * fewer than 4 blocks gets more after its last one only while they fit in the
 * work hours (at least an hour before the stop), so a day planned to the end
 * (9–11:30 + a 1–5 PM Zoom) stays as planned.
 */
export function planDayTimes(
  planned: readonly { start: string; end: string }[],
  hours: string | undefined | null,
): { start: string; end: string }[] {
  if (!planned.length) return defaultDayTimes(DEFAULT_DAY_BLOCKS, hours);
  const out = planned
    .slice(0, MAX_DAY_BLOCKS)
    .map((p) => withLength({ start: p.start, end: p.end || p.start }));
  const stop = parseWorkHours(hours)?.stop ?? null;
  while (out.length < DEFAULT_DAY_BLOCKS) {
    const next = nextBlockTimes(out[out.length - 1], out.length, hours, null);
    if (stop != null) {
      const at = workMinutes(next.start, hours);
      if (at == null || at + MIN_FIT_MINUTES > stop) break;
    }
    out.push(next);
  }
  return out;
}

/**
 * Times for a block added after `prev` with a given length (Move to
 * tomorrow keeps the block's length): 15 min after `prev` ends, on the
 * quarter hour; the work-day start when there is no block before it.
 */
export function addedBlockTimes(
  prev: { start: string; end: string } | undefined,
  index: number,
  minutes: number,
  hours: string | undefined | null,
): { start: string; end: string } {
  const base = prev?.end ? nextBlockTimes(prev, index, hours, null) : withLength(blockDefaults(0, hours));
  const a = toMinutes(base.start) ?? 0;
  return { start: base.start, end: toClock(a + minutes) };
}

/** Slots with block `index` taken out (later ones move up, an empty one at the end). */
export function withoutSlot<T>(slots: readonly T[], index: number, empty: () => T): T[] {
  if (index < 0 || index >= slots.length) return [...slots];
  return [...slots.slice(0, index), ...slots.slice(index + 1), empty()];
}

type CountSlot = { start: string; end: string; task?: string; outcome?: string };

function hasContent(slot: CountSlot | null | undefined) {
  return Boolean(slot && (slot.start || slot.end || slot.task || slot.outcome));
}

/**
 * How many blocks a saved day shows: at least up to the last block with
 * anything in it, at least what was saved, and, for days saved before the
 * 4–8 block page (`legacy`, slotCount 1–3), at least 4, so nothing is hidden.
 */
export function dayBlockCount(
  slots: readonly (CountSlot | null | undefined)[],
  stored: unknown,
  legacy: boolean,
): number {
  let n = MIN_DAY_BLOCKS;
  for (let i = 0; i < Math.min(slots.length, MAX_DAY_BLOCKS); i++) if (hasContent(slots[i])) n = i + 1;
  const saved = typeof stored === "number" && Number.isFinite(stored) ? clampBlockCount(stored) : MIN_DAY_BLOCKS;
  return Math.max(n, saved, legacy ? DEFAULT_DAY_BLOCKS : MIN_DAY_BLOCKS);
}

/**
 * Times for visible blocks that have neither a start nor an end (a day saved
 * with 1–3 blocks now opening with 4): each follows the block before it, as
 * Add another block would. Returns only the blocks to fill.
 */
export function fillBlankTimes(
  slots: readonly (PlanSlot | null | undefined)[],
  count: number,
  hours: string | undefined | null,
): { index: number; start: string; end: string }[] {
  const out: { index: number; start: string; end: string }[] = [];
  let prev: PlanSlot | undefined;
  for (let i = 0; i < Math.min(clampBlockCount(count), MAX_DAY_BLOCKS); i++) {
    const slot = slots[i];
    if (slot && (slot.start || slot.end || slot.started)) {
      prev = slot;
      continue;
    }
    const t = i === 0 ? withLength(blockDefaults(0, hours)) : nextBlockTimes(prev, i, hours, null);
    out.push({ index: i, ...t });
    prev = { start: t.start, end: t.end };
  }
  return out;
}
