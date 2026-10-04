import { isDateKey } from "./utils";
import { currentWorkdayKey } from "./workday";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Deep Focus Daily - 2026-10-01 (Thu)" — becomes Chrome's suggested PDF name. */
export function dailyPrintTitle(date: string = currentWorkdayKey()) {
  if (!isDateKey(date)) return "Deep Focus Daily";
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, (m ?? 1) - 1, d ?? 1).getDay()];
  return `Deep Focus Daily - ${date} (${wd})`;
}

/** Fit every Daily OS textarea to its content so print shows full notes, no scrollbars. */
export function fitTextareasForPrint(root: ParentNode = document) {
  root.querySelectorAll<HTMLTextAreaElement>(".daily-os textarea").forEach((el) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  });
}

function clearTextareaFit(root: ParentNode = document) {
  root.querySelectorAll<HTMLTextAreaElement>(".daily-os textarea").forEach((el) => {
    el.style.height = "";
  });
}

/* ---------- "Already saved this day" tracking ---------- */

const PRINTED_KEY = "df-printed:";
/** Close day skips its Save PDF prompt if the day was printed this recently. */
export const RECENT_PRINT_MS = 10 * 60 * 1000;

/** Daily OS date on screen right now (set by DailyOs), so Cmd+P counts too. */
let activePrintDate: string | null = null;
let pendingPrintDate: string | null = null;

export function setActivePrintDate(date: string | null) {
  activePrintDate = date;
}

export function markPrinted(date: string, at = Date.now()) {
  if (!isDateKey(date)) return;
  try {
    window.localStorage.setItem(PRINTED_KEY + date, String(at));
  } catch {
    /* storage unavailable — Close day will just offer the PDF again */
  }
}

/** True if this day's Daily OS was printed / saved as PDF in the last ~10 min. */
export function printedRecently(date: string, now = Date.now(), within = RECENT_PRINT_MS) {
  if (typeof window === "undefined" || !isDateKey(date)) return false;
  try {
    const at = Number(window.localStorage.getItem(PRINTED_KEY + date));
    return Number.isFinite(at) && at > 0 && now - at >= 0 && now - at <= within;
  } catch {
    return false;
  }
}

function recordPrint() {
  const date = pendingPrintDate ?? activePrintDate;
  if (date) markPrinted(date);
}

let installed = false;

/**
 * Size textareas to content for any print (Cmd+P too), and put them back after.
 * Safe to call more than once.
 */
export function installPrintTextareaFit() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("beforeprint", () => {
    fitTextareasForPrint();
    recordPrint();
  });
  window.addEventListener("afterprint", () => {
    clearTextareaFit();
    recordPrint();
    pendingPrintDate = null;
  });
}

/**
 * Print with a dated document title (Chrome uses it as the PDF file name),
 * then restore the original title on afterprint.
 */
export function printDaily(date: string = currentWorkdayKey()) {
  if (typeof window === "undefined") return;
  installPrintTextareaFit();
  const previous = document.title;
  document.title = dailyPrintTitle(date);
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = previous;
    pendingPrintDate = null;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  fitTextareasForPrint();
  pendingPrintDate = date;
  markPrinted(date);
  try {
    window.print();
  } finally {
    // Some browsers return from print() without firing afterprint; restore shortly after.
    window.setTimeout(restore, 1000);
  }
}
