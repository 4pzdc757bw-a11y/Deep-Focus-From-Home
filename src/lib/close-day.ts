import { useFocusStore } from "./store";

import { currentWorkdayKey } from "./workday";
import { starterDayOn } from "./work-hours";
import { latestClosedIn, nextDateForward } from "./close-day-forward";
import { isDayClosed } from "./close-day-rules";

/**
 * Map a work-day date to starter day 1–7, or null if outside week one. Day 1
 * is the start date; Days 2–7 are the next picked work days.
 */
export function starterDayForDate(
  starterStart: string | null,
  date: string,
  workDays: readonly number[] | null | undefined = useFocusStore.getState().household?.workDays,
): number | null {
  return starterDayOn(starterStart, date, workDays);
}

/**
 * Next Daily OS date after closing (or skipping) `closedDate`: the next work
 * day from Getting started (Mon–Fri if none saved), so Friday → Monday. Never
 * earlier than today (local time), whatever stale state is in local storage.
 */
export function nextDateAfterClose(
  closedDate: string,
  today = currentWorkdayKey(),
  workDays: readonly number[] | null | undefined = useFocusStore.getState().household?.workDays,
  latestClosed: string | null = latestClosedDate(),
) {
  return nextDateForward(closedDate, today, workDays, latestClosed);
}

export { nextDateForward };

/** Latest day whose Close day ran (shutdown checked), or null. */
export function latestClosedDate(
  dailies: Record<string, { checks?: { shutdown?: boolean } } | undefined> = useFocusStore.getState().dailies,
): string | null {
  return latestClosedIn(dailies);
}

export type CloseDayResult = {
  starterDay: number | null;
  nextDay: number | null;
  nextDate: string;
  noteCopied: boolean;
};

/**
 * Close the workday: copy Shutdown note (and Other things I did today) →
 * starter “one line”, mark day done,
 * keep the daily entry in local history, return next-day pointers for nav/print.
 */
export function closeDay(osDate = currentWorkdayKey()): CloseDayResult {
  const store = useFocusStore.getState();
  const started = store.starterStart;

  // A day closes once. Closing it again changes nothing and just points to the next day.
  if (isDayClosed(store.dailies[osDate])) {
    const nextDate = nextDateAfterClose(osDate, currentWorkdayKey());
    const day = started ? starterDayForDate(started, osDate) : null;
    const nextDay = started ? starterDayForDate(started, nextDate) : null;
    return { starterDay: day, nextDay, nextDate, noteCopied: false };
  }

  // Only touch the starter week when this date is one of its seven days.
  // No starter week set (or a stale one) → just close the Daily OS.
  const day = started ? starterDayForDate(started, osDate) : null;

  const entry = store.dailies[osDate];
  // Shutdown note, then "Other things I did today", each copied once.
  const lines = [entry?.note, entry?.otherNote].map((t) => (t ?? "").trim()).filter(Boolean);
  let noteCopied = false;

  if (day != null) {
    for (const line of lines) {
      const existing = (useFocusStore.getState().starterNotes[day] ?? "").trim();
      if (!existing) {
        store.setStarterNote(day, line);
        noteCopied = true;
      } else if (!existing.includes(line)) {
        store.setStarterNote(day, `${existing}\n${line}`);
        noteCopied = true;
      }
    }
    if (!store.starterDone.includes(day)) {
      store.toggleStarterDay(day);
    }
  }

  // Mark the day closed (so it can't be closed twice) and the shutdown check
  // done on the daily OS for history.
  store.patchDaily(osDate, { closed: true });
  const closedEntry = useFocusStore.getState().dailies[osDate];
  if (closedEntry) {
    store.patchDaily(osDate, {
      checks: { ...closedEntry.checks, shutdown: true },
    });
  }

  const fresh = useFocusStore.getState();
  const nextDate = nextDateAfterClose(osDate, currentWorkdayKey());
  const nextDay = fresh.starterStart ? starterDayForDate(fresh.starterStart, nextDate) : null;

  return { starterDay: day, nextDay, nextDate, noteCopied };
}
