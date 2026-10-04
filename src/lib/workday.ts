import { useFocusStore } from "./store";
import { workdayKey } from "./work-hours";

/**
 * Today's WORK DAY (YYYY-MM-DD) from the saved work hours. Same as the
 * calendar date for daytime hours; for a night shift (11 PM–7 AM) the small
 * hours still belong to the shift that started the evening before.
 */
export function currentWorkdayKey(now = new Date()) {
  return workdayKey(now, useFocusStore.getState().household?.hours);
}

/** Hook version: re-renders when the work hours change. */
export function useWorkdayKey(now = new Date()) {
  const hours = useFocusStore((s) => s.household?.hours);
  return workdayKey(now, hours);
}
