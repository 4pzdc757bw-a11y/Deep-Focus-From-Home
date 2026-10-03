import { durationMinutes, stampClockNow } from "./chime.ts";

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
    if (ahead >= 60_000) return { start, end: slot.end, endsAt: endAt.getTime() };
  }
  const endsAt = now.getTime() + planned * 60_000;
  return { start, end: stampClockNow(new Date(endsAt)), endsAt };
}

