import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { jsPDF } from "jspdf";
import { drawDailyPdf, pdfText, type PdfDay } from "./daily-pdf-layout.ts";

const long = "Write the long report section and check every figure twice before lunch. ".repeat(12);

function day(blocks: number, notes = long): PdfDay {
  return {
    brand: "Deep Focus from Home",
    kicker: "Daily Focus OS",
    dateLine: "Thursday, October 8, 2026",
    prepHeading: "Check all three before you ring the bell",
    slots: Array.from({ length: blocks }, (_, i) => ({
      label: `Block ${i + 1}`,
      times: "9:00 AM - 10:30 AM",
      task: long,
      outcome: long,
      done: i % 2 === 0,
      prep: [
        { label: "Work-only surface is clear", checked: true },
        { label: "Phone parked for the block (off desk / out of reach)", checked: false },
        { label: "Household signal is on", checked: true },
      ],
    })),
    partnerNote: notes,
    otherNote: notes,
    shutdownNote: notes,
    blockStarted: true,
    steps: [
      { id: "outcomes", label: "Review and mark the day’s top outcomes", checked: true },
      { id: "loops", label: "Capture open loops for tomorrow", checked: true },
    ],
    noteAfterId: "loops",
    shutdownDone: false,
    footer: "deepfocusfromhome.com · support@deepfocusfromhome.com",
  };
}

describe("Save PDF (Close day)", () => {
  for (const n of [1, 4, 8]) {
    it(`${n} blocks with long notes stay on one Letter page`, () => {
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      drawDailyPdf(doc, day(n));
      assert.equal(doc.getNumberOfPages(), 1);
      const out = doc.output();
      assert.match(out, /Deep Focus from Home/);
      assert.match(out, /deepfocusfromhome\.com/);
      assert.match(out, /support@deepfocusfromhome\.com/);
      assert.match(out, /CHECK ALL THREE BEFORE YOU RING THE BELL/);
      assert.match(out, /Shutdown sequence done/);
    });
  }

  it("keeps text to characters the PDF font can draw", () => {
    assert.equal(pdfText("day’s “top” – done…"), `day's "top" - done...`);
  });
});
