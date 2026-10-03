import { durationMinutes, stampClockNow } from "./chime.ts";
import { parseWorkHours, spanMinutes, toClock, workMinutes } from "./work-hours.ts";

const DEFAULT_BLOCK_MINUTES = 90;
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
