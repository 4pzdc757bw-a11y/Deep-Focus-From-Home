/**
 * Draws one Daily Focus OS day onto a jsPDF page (US Letter, one page) for
 * Close day → "Save PDF". Pure: no store / DOM imports, so it runs in tests.
 * Same order as the printed page: branded header, blocks (time, task,
 * outcome + Done, the three bell checks), notes, end of day, footer.
 */
import type { jsPDF } from "jspdf";

export type PdfSlot = {
  label: string;
  times: string;
  task: string;
  outcome: string;
  done: boolean;
  /** One entry per "before you ring the bell" check, in order. */
  prep: { label: string; checked: boolean }[];
};

export type PdfDay = {
  brand: string;
  kicker: string;
  dateLine: string;
  prepHeading: string;
  slots: PdfSlot[];
  partnerNote: string;
  otherNote: string;
  shutdownNote: string;
  blockStarted: boolean;
  /** Shutdown steps in order; the Shutdown note prints under `noteAfterId`. */
  steps: { id: string; label: string; checked: boolean }[];
  noteAfterId: string;
  shutdownDone: boolean;
  footer: string;
  /** JPEG data URL of the site logo (optional). */
  logo?: string | null;
};

const OLIVE: [number, number, number] = [58, 74, 50];
const GOLD: [number, number, number] = [139, 122, 62];
const INK: [number, number, number] = [44, 53, 40];
const MUTED: [number, number, number] = [92, 107, 82];
const PAGE_W = 612;
const PAGE_H = 792;
const M = 36;
const W = PAGE_W - M * 2;

/** Standard PDF fonts are WinAnsi: keep text to characters they draw. */
export function pdfText(s: string) {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\n\x20-\x7E\u00A0-\u00FF]/g, "");
}

export function drawDailyPdf(doc: jsPDF, day: PdfDay) {
  const color = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style: "normal" | "bold" | "italic", size: number) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
  };
  const lines = (text: string, width: number, max: number) => {
    const all = doc.splitTextToSize(pdfText(text), width) as string[];
    if (all.length <= max) return all;
    const kept = all.slice(0, max);
    kept[max - 1] = `${kept[max - 1].replace(/\s+\S*$/, "")} ...`;
    return kept;
  };
  const box = (x: number, y: number, size: number, checked: boolean) => {
    doc.setDrawColor(OLIVE[0], OLIVE[1], OLIVE[2]);
    doc.setLineWidth(1);
    if (checked) {
      doc.setFillColor(OLIVE[0], OLIVE[1], OLIVE[2]);
      doc.rect(x, y, size, size, "FD");
      doc.setDrawColor(255, 254, 248);
      doc.setLineWidth(1.4);
      doc.line(x + size * 0.2, y + size * 0.55, x + size * 0.42, y + size * 0.78);
      doc.line(x + size * 0.42, y + size * 0.78, x + size * 0.82, y + size * 0.25);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, size, size, "FD");
    }
  };
  const rule = (y: number, c = OLIVE, w = 1.5) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
    doc.line(M, y, PAGE_W - M, y);
  };

  // ---- Header
  let y = M;
  let textX = M;
  if (day.logo) {
    try {
      doc.addImage(day.logo, "JPEG", M, y, 26, 38);
      textX = M + 34;
    } catch {
      /* logo is decoration only */
    }
  }
  color(OLIVE);
  font("bold", 17);
  doc.text(pdfText(day.brand), textX, y + 17);
  color(GOLD);
  font("bold", 7.5);
  doc.text(pdfText(day.kicker.toUpperCase()), textX, y + 30, { charSpace: 1.2 });
  color(OLIVE);
  font("bold", 12);
  doc.text(pdfText(day.dateLine), PAGE_W - M, y + 17, { align: "right" });
  y += 44;
  rule(y);
  y += 8;

  // ---- Footer (reserved first so content stops above it)
  const footerY = PAGE_H - M + 8;
  rule(footerY - 10, GOLD, 0.6);
  color(MUTED);
  font("normal", 8);
  doc.text(pdfText(day.footer), PAGE_W / 2, footerY, { align: "center" });

  // Space for notes + end of day after the blocks.
  const n = Math.max(1, day.slots.length);
  const endDayH = 21 + 12 + 11 + day.steps.length * 13 + 12 + 10;
  const noteMin = 40;
  const tailMin = noteMin + 18 + endDayH + noteMin + 10;
  const blocksAvail = footerY - 14 - y - tailMin - 12;
  const blockH = Math.min(78, Math.max(46, blocksAvail / n));
  const taskLines = blockH >= 64 ? 2 : 1;

  // Bell heading once above the blocks
  color(GOLD);
  font("bold", 7.5);
  doc.text(pdfText(day.prepHeading.toUpperCase()), M, y + 6, { charSpace: 0.6 });
  y += 12;

  const colTimes = 128;
  const colTask = (W - colTimes - 12) * 0.55;
  const colOut = W - colTimes - 12 - colTask - 8;
  for (const slot of day.slots) {
    const top = y;
    doc.setDrawColor(OLIVE[0], OLIVE[1], OLIVE[2]);
    doc.setLineWidth(1);
    doc.roundedRect(M, top, W, blockH - 4, 3, 3, "S");
    // label + times
    color(GOLD);
    font("bold", 7.5);
    doc.text(pdfText(slot.label.toUpperCase()), M + 6, top + 11, { charSpace: 0.8 });
    color(INK);
    font("normal", 9.5);
    doc.text(pdfText(slot.times || "Starts ____  Ends ____"), M + 6, top + 24);
    // task
    const tx = M + colTimes + 6;
    color(MUTED);
    font("bold", 6.5);
    doc.text("TASK IN THIS SLOT", tx, top + 10);
    color(INK);
    font("normal", 9.5);
    doc.text(lines(slot.task, colTask, taskLines), tx, top + 21, { lineHeightFactor: 1.15 });
    // outcome + Done
    const ox = tx + colTask + 8;
    color(MUTED);
    font("bold", 6.5);
    doc.text("OUTCOME", ox, top + 10);
    color(INK);
    font("normal", 9.5);
    doc.text(lines(slot.outcome, colOut - 44, taskLines), ox, top + 21, { lineHeightFactor: 1.15 });
    box(M + W - 44, top + 13, 9, slot.done);
    font("normal", 8.5);
    doc.text("Done", M + W - 32, top + 20.5);
    // bell checks row
    let cx = M + 6;
    const cy = top + blockH - 15;
    font("normal", 8);
    for (const p of slot.prep) {
      box(cx, cy - 7, 8, p.checked);
      const label = pdfText(p.label);
      doc.text(label, cx + 11, cy);
      cx += 11 + doc.getTextWidth(label) + 14;
    }
    y += blockH;
  }

  // ---- Notes: partner + other things, side by side
  const tail = footerY - 14 - y;
  const noteH = Math.max(noteMin, Math.min(110, (tail - endDayH - 30) / 2));
  const half = (W - 10) / 2;
  const note = (label: string, text: string, x: number, w: number, h: number) => {
    color(MUTED);
    font("bold", 6.5);
    doc.text(pdfText(label.toUpperCase()), x, y + 6);
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y + 9, w, h - 12, 2, 2, "S");
    color(INK);
    font("normal", 9);
    const max = Math.max(1, Math.floor((h - 18) / 10.5));
    doc.text(lines(text, w - 10, max), x + 5, y + 20, { lineHeightFactor: 1.15 });
  };
  note("Note to accountability partner", day.partnerNote, M, half, noteH);
  note("Other things I did today", day.otherNote, M + half + 10, half, noteH);
  y += noteH + 4;

  // ---- End of day
  color(GOLD);
  font("bold", 7.5);
  doc.text("END OF DAY", M, y + 8, { charSpace: 1 });
  y += 21;
  const status = (label: string, done: boolean) => {
    box(M, y - 7, 8, done);
    color(INK);
    font("normal", 9);
    doc.text(pdfText(label), M + 12, y);
    y += 12;
  };
  status("Deep-work block started", day.blockStarted);
  color(GOLD);
  font("bold", 7);
  doc.text("SHUTDOWN · 5 MINUTES", M, y, { charSpace: 0.8 });
  y += 11;
  for (const step of day.steps) {
    box(M, y - 7, 8, step.checked);
    color(INK);
    font("normal", 9);
    doc.text(pdfText(step.label), M + 12, y);
    y += 13;
    if (step.id === day.noteAfterId) {
      const h = Math.max(noteMin, Math.min(120, footerY - 14 - y - (day.steps.length * 13 + 12)));
      note("Shutdown note", day.shutdownNote, M + 12, W - 12, h);
      y += h + 10;
    }
  }
  status("Shutdown sequence done", day.shutdownDone);
  return doc;
}
