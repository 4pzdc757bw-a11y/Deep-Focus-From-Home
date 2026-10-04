/** Quick picks for energy check-ins. */
export const TIME_OF_DAY_OPTIONS = ["Morning", "Afternoon", "Evening"] as const;

/**
 * Morning 5:00–11:59, Afternoon 12:00–16:59, Evening 17:00 and later (local).
 * The small hours (midnight–4:59) count as Evening too, so a night-shift
 * block at 1 AM is logged as the late end of the evening, not "Morning".
 */
export function periodFromHour(h: number) {
  if (h < 5) return "Evening";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

/** Period for an "HH:MM" clock string; "" if it can't be read. */
export function periodFromClock(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return "";
  const h = Number(m[1]);
  if (!Number.isFinite(h) || h < 0 || h > 23) return "";
  return periodFromHour(h);
}

/** Period for right now, in the device's local time. */
export function periodNow(now = new Date()) {
  return periodFromHour(now.getHours());
}

/** "Thu, Oct 1 · 9:24 PM" in local time. */
export function checkInStamp(at: number | Date) {
  const d = typeof at === "number" ? new Date(at) : at;
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
}
