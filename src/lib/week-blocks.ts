/**
 * This week's focus blocks are saved as one line of text each (This week page,
 * Weekly planner): "Mon 11:30 AM–1:00 PM · hardest task". Getting started
 * builds that line from day/time pickers and reads it back the same way.
 */
import { WEEKDAY_SHORT, clock12, parseWorkHours } from "./work-hours.ts";

export type WeekBlockDraft = {
  /** 0 = Sunday … 6 = Saturday. */
  day: number;
  /** "HH:MM" 24-hour. */
  start: string;
  end: string;
  task: string;
};

export function formatWeekBlock(b: WeekBlockDraft): string {
  const day = WEEKDAY_SHORT[b.day] ?? "";
  const times = b.start && b.end ? `${clock12(b.start)}–${clock12(b.end)}` : "";
  const head = [day, times].filter(Boolean).join(" ");
  const task = b.task.trim();
  return task ? `${head} · ${task}` : head;
}

const DAY_RE = /^\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s*/i;

/** Best-effort read of a saved line; null when it has no day we recognise. */
export function parseWeekBlock(text: string | undefined | null): WeekBlockDraft | null {
  const raw = (text ?? "").trim();
  const dm = DAY_RE.exec(raw);
  if (!dm) return null;
  const day = WEEKDAY_SHORT.findIndex((d) => d.toLowerCase() === dm[1]!.toLowerCase());
  let rest = raw.slice(dm[0].length);
  let task = "";
  const sep = rest.search(/\s[·|-]\s|\s·|·/);
  if (sep >= 0) {
    task = rest.slice(sep).replace(/^\s*[·|-]\s*/, "").trim();
    rest = rest.slice(0, sep);
  }
  const hours = parseWorkHours(rest);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  return {
    day,
    start: hours ? clock(hours.start) : "",
    end: hours?.stop != null ? clock(hours.stop) : "",
    task,
  };
}
