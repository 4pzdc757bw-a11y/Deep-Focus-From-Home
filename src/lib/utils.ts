import { starterDayDates } from "./work-hours";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function weekdayLong(d = new Date()) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekKey(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return todayKey(date);
}

export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addDaysKey(start: string, days: number) {
  const [y, m, d] = start.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return todayKey(date);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function prettyDate(key: string) {
  if (!isDateKey(key)) return key;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Sunday=0 … Saturday=6. Override with ?friday=1|0 for local testing. */
export function isFriday(d = new Date()) {
  if (typeof window !== "undefined") {
    const force = new URLSearchParams(window.location.search).get("friday");
    if (force === "1" || force === "true") return true;
    if (force === "0" || force === "false") return false;
  }
  return d.getDay() === 5;
}

/** Monday key for the week after `d` (same shape as weekKey). */
export function nextWeekKey(d = new Date()) {
  const next = new Date(d);
  next.setDate(next.getDate() + 7);
  return weekKey(next);
}

/** Calendar day 8+ of the starter week. Override with ?week2=1|0 for local testing. */
/**
 * Week two begins after starter Day 7 (Day 1 = start date, Days 2–7 = next
 * picked work days). `today` is the current work day (YYYY-MM-DD).
 */
export function isWeekTwo(
  starterStart: string | null,
  today: string = todayKey(),
  workDays?: readonly number[] | null,
) {
  if (typeof window !== "undefined") {
    const force = new URLSearchParams(window.location.search).get("week2");
    if (force === "1" || force === "true") return true;
    if (force === "0" || force === "false") return false;
  }
  if (!starterStart) return false;
  return today > starterDayDates(starterStart, workDays)[6]!;
}

/** Force Home focus setup sheet. ?homeFocus=1 for local testing (re-show after Skip). */
export function forceHomeFocusSetupPrompt() {
  if (typeof window === "undefined") return false;
  const force = new URLSearchParams(window.location.search).get("homeFocus");
  return force === "1" || force === "true";
}

