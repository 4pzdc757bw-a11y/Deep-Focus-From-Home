/**
 * Close day → "Save PDF": builds a real PDF of the day (no print dialog) and
 * downloads it straight to Downloads, named like the print title
 * ("Deep Focus Daily - 2026-10-08 (Thu).pdf").
 */
import { BLOCK_PREP_CHECKS, PRINT_FOOTER, SHUTDOWN_STEPS, APP_NAME } from "./content";
import { prepHeading } from "./block-prep";
import { clampBlockCount } from "./block-plan";
import { drawDailyPdf, type PdfDay } from "./daily-pdf-layout";
import { dailyPrintTitle, markPrinted } from "./print";
import { emptyPrep, emptyShutdownSteps, migrateDaily, useFocusStore } from "./store";
import { clock12 } from "./work-hours";

function longDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/images/logo.jpg");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** The saved day as the PDF draws it. */
export function dailyPdfData(date: string): PdfDay {
  const st = useFocusStore.getState();
  const raw = st.dailies[date];
  const entry = raw
    ? migrateDaily(raw as unknown as Record<string, unknown>, st.household?.hours)
    : migrateDaily({}, st.household?.hours);
  const visible = clampBlockCount(entry.slotCount);
  const steps = { ...emptyShutdownSteps(), ...entry.shutdownSteps };
  return {
    brand: APP_NAME,
    kicker: "Daily Focus OS",
    dateLine: longDate(date),
    prepHeading: prepHeading(BLOCK_PREP_CHECKS.length),
    slots: entry.slots.slice(0, visible).map((sl, i) => {
      const prep = sl.prep ?? emptyPrep();
      return {
        label: `Block ${i + 1}`,
        times: sl.start && sl.end ? `${clock12(sl.start)} - ${clock12(sl.end)}` : "",
        task: sl.task,
        outcome: sl.outcome,
        done: Boolean(sl.outcomeDone),
        prep: BLOCK_PREP_CHECKS.map((c) => ({ label: c.label, checked: Boolean(prep[c.id]) })),
      };
    }),
    partnerNote: entry.partnerNote,
    otherNote: entry.otherNote ?? "",
    shutdownNote: entry.note,
    blockStarted: Boolean(entry.checks.block),
    steps: SHUTDOWN_STEPS.map((s) => ({ id: s.id, label: s.label, checked: Boolean(steps[s.id]) })),
    noteAfterId: "loops",
    shutdownDone: Boolean(entry.checks.shutdown),
    footer: PRINT_FOOTER,
  };
}

/** Download this day's PDF. Resolves false if the browser could not make it. */
export async function saveDailyPdf(date: string): Promise<boolean> {
  try {
    const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), logoDataUrl()]);
    const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });
    const title = dailyPrintTitle(date);
    doc.setProperties({ title, author: APP_NAME, subject: "Daily Focus OS" });
    drawDailyPdf(doc, { ...dailyPdfData(date), logo });
    doc.save(`${title}.pdf`);
    markPrinted(date);
    return true;
  } catch {
    return false;
  }
}
