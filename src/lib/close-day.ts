import { useFocusStore } from "./store";

import { currentWorkdayKey } from "./workday";
import { nextWorkdayFrom, starterDayOn } from "./work-hours";

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

/**
 * Pure: next work day after the closed day, never moving backward — not
 * before today, and not on or before a day already closed later (closing
 * Wednesday after Monday… opens Thursday, never Monday again).
 */
export function nextDateForward(
  closedDate: string,
  today: string,
  workDays: readonly number[] | null | undefined,
  latestClosed: string | null,
) {
  const base = latestClosed && latestClosed > closedDate ? latestClosed : closedDate;
  return nextWorkdayFrom(base, today, workDays);
}

/** Latest day whose Close day ran (shutdown checked), or null. */
export function latestClosedDate(
  dailies: Record<string, { checks?: { shutdown?: boolean } } | undefined> = useFocusStore.getState().dailies,
): string | null {
  let latest: string | null = null;
  for (const [k, v] of Object.entries(dailies)) {
    if (v?.checks?.shutdown && (!latest || k > latest)) latest = k;
  }
  return latest;
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
export function closeDay(osDate = currentWorkdayKey()): CloseDayResult {
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
  const nextDate = nextDateAfterClose(osDate, currentWorkdayKey());
  const nextDay = fresh.starterStart ? starterDayForDate(fresh.starterStart, nextDate) : null;

  return { starterDay: day, nextDay, nextDate, noteCopied };
}
