import { nextWorkdayFrom } from "./work-hours.ts";

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

/** Pure: latest day whose Close day ran (shutdown checked), or null. */
export function latestClosedIn(
  dailies: Record<string, { checks?: { shutdown?: boolean } } | undefined>,
): string | null {
  let latest: string | null = null;
  for (const [k, v] of Object.entries(dailies)) {
    if (v?.checks?.shutdown && (!latest || k > latest)) latest = k;
  }
  return latest;
}
