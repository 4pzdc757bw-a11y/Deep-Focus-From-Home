import { isDateKey, todayKey } from "./utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Deep Focus Daily - 2026-10-01 (Thu)" — becomes Chrome's suggested PDF name. */
export function dailyPrintTitle(date: string = todayKey()) {
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

let installed = false;

/**
 * Size textareas to content for any print (Cmd+P too), and put them back after.
 * Safe to call more than once.
 */
export function installPrintTextareaFit() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("beforeprint", () => fitTextareasForPrint());
  window.addEventListener("afterprint", () => clearTextareaFit());
}

/**
 * Print with a dated document title (Chrome uses it as the PDF file name),
 * then restore the original title on afterprint.
 */
export function printDaily(date: string = todayKey()) {
  if (typeof window === "undefined") return;
  installPrintTextareaFit();
  const previous = document.title;
  document.title = dailyPrintTitle(date);
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  fitTextareasForPrint();
  try {
    window.print();
  } finally {
    // Some browsers return from print() without firing afterprint; restore shortly after.
    window.setTimeout(restore, 1000);
  }
}
