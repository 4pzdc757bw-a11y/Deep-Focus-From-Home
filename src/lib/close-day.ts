import { STARTER_DAYS } from "./content";
import { useFocusStore } from "./store";
import { addDaysKey, todayKey } from "./utils";

/** Map a calendar date to starter day 1–7, or null if outside week one. */
export function starterDayForDate(
  starterStart: string | null,
  date: string,
): number | null {
  if (!starterStart) return null;
  for (const d of STARTER_DAYS) {
    if (addDaysKey(starterStart, d.day - 1) === date) return d.day;
  }
  return null;
}

/**
 * Next Daily OS date after closing `closedDate`: the following calendar day,
 * but never earlier than today (local time). Never jumps backward, whatever
 * stale starter-week state is in local storage.
 */
export function nextDateAfterClose(closedDate: string, today = todayKey()) {
  const dayAfter = addDaysKey(closedDate, 1);
  return dayAfter > today ? dayAfter : today;
}

export type CloseDayResult = {
  starterDay: number | null;
  nextDay: number | null;
  nextDate: string;
  noteCopied: boolean;
};

/**
 * Close the workday: copy Shutdown note → starter “one line”, mark day done,
 * keep the daily entry in local history, return next-day pointers for nav/print.
 */
export function closeDay(osDate = todayKey()): CloseDayResult {
  const store = useFocusStore.getState();
  const started = store.starterStart;

  // Only touch the starter week when this date is one of its seven days.
  // No starter week set (or a stale one) → just close the Daily OS.
  const day = started ? starterDayForDate(started, osDate) : null;

  const entry = store.dailies[osDate];
  const shutdown = (entry?.note ?? "").trim();
  let noteCopied = false;

  if (day != null) {
    if (shutdown) {
      const existing = (store.starterNotes[day] ?? "").trim();
      if (!existing) {
        store.setStarterNote(day, shutdown);
        noteCopied = true;
      } else if (!existing.includes(shutdown)) {
        store.setStarterNote(day, `${existing}\n${shutdown}`);
        noteCopied = true;
      }
    }
    if (!store.starterDone.includes(day)) {
      store.toggleStarterDay(day);
    }
  }

  // Ensure shutdown check is marked on the daily OS for history.
  if (entry) {
    store.patchDaily(osDate, {
      checks: { ...entry.checks, shutdown: true },
    });
  }

  const fresh = useFocusStore.getState();
  const nextDate = nextDateAfterClose(osDate);
  const nextDay = fresh.starterStart ? starterDayForDate(fresh.starterStart, nextDate) : null;

  return { starterDay: day, nextDay, nextDate, noteCopied };
}
