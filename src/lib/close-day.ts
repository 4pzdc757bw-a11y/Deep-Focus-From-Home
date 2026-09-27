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
  if (!store.starterStart) store.startStarter();
  const started = useFocusStore.getState().starterStart ?? todayKey();

  let day = starterDayForDate(started, osDate);
  // If viewing a non-starter date during week one, close the current unfinished day.
  if (day == null) {
    const unfinished = STARTER_DAYS.find((d) => !store.starterDone.includes(d.day));
    day = unfinished?.day ?? null;
  }

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
  const next = STARTER_DAYS.find((d) => !fresh.starterDone.includes(d.day));
  const nextDay = next?.day ?? null;
  const nextDate =
    nextDay != null ? addDaysKey(fresh.starterStart ?? started, nextDay - 1) : osDate;

  return { starterDay: day, nextDay, nextDate, noteCopied };
}
