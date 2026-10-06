#!/usr/bin/env python3
"""
Build the free 7-day starter pack PDF from the starter days in src/lib/content.ts.

    python3 scripts/build-starter-pdf.py            # writes public/downloads/7-day-starter-pack.pdf
    python3 scripts/build-starter-pdf.py out.pdf    # writes somewhere else

Fillable (AcroForm) and printable: every write-in box from STARTER_WRITE_INS,
a "done" checkbox and the one-line note per day sit on printed lines, so the
same file works typed into on screen or filled in by hand on paper.

Needs Python 3 with reportlab, and Node. Reads content.ts with Node 22+
--experimental-strip-types, or falls back to the repo's TypeScript compiler on
older Node. Set NODE=/path/to/node to pick a Node.
Keeps the original Sep 2026 look: US Letter, Helvetica, olive headings.
Each day starts on its own page (page 1 = title, "How this week works" and Day 1)
so any single day prints cleanly. "by Jeffsebiz" sits under the title and in
every page footer (brand rule: keep "by Jeffsebiz" visible).
Free-pack copy only: it never tells the reader to use the paid app.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public/downloads/7-day-starter-pack.pdf"

HEADER_LINE = (
    "Phone rule: Plan the day first. During the deep-work block, park the phone off your desk. "
    "Check messages between blocks."
)
BRAND_LINE = "by Jeffsebiz"
PAGE_FOOTER = "Deep Focus from Home — 7-Day Starter Pack  ·  by Jeffsebiz"
FOOTER_LINE = "Daily check (after Day 3): Phone parked for the block (off desk / out of reach)."
# The page says "the boxes under that day (saved in this browser…)"; the PDF version of the same note.
PDF_HOW_IT_WORKS = [
    "Each day has one job. Do the steps in your real workday, not on this page.",
    "Anything a step asks you to write goes on the lines under that day: type into this PDF "
    "(save it after) or print it and use a pen.",
    "Calendar steps go on whatever calendar you already use: phone, Google or paper.",
]

OLIVE = colors.HexColor("#3A4A32")
INK = colors.HexColor("#2C3528")
MUTED = colors.HexColor("#5C6B52")
GOLD = colors.HexColor("#655626")
LINE = colors.HexColor("#8A9480")
BOXBG = colors.HexColor("#F4F1E0")

LOADER = r"""
const fs = require("fs"), os = require("os"), path = require("path");
const src = path.resolve("src/lib/content.ts");
async function main() {
  let m;
  try { m = await import(src); } catch (e) {
    const ts = require(path.resolve("node_modules/typescript"));
    const js = ts.transpileModule(fs.readFileSync(src, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const tmp = path.join(os.tmpdir(), "df-content-" + process.pid + ".mjs");
    fs.writeFileSync(tmp, js);
    try { m = await import(tmp); } finally { fs.unlinkSync(tmp); }
  }
  process.stdout.write(JSON.stringify({ days: m.STARTER_DAYS, writeIns: m.STARTER_WRITE_INS }));
}
main().catch((e) => { console.error(e); process.exit(1); });
"""


def load_content():
    node = os.environ.get("NODE", "node")
    major = int(subprocess.run([node, "-p", "process.versions.node.split('.')[0]"],
                               capture_output=True, text=True, check=True).stdout.strip())
    flags = ["--experimental-strip-types", "--no-warnings"] if major >= 22 else []
    out = subprocess.run([node, *flags, "-e", LOADER], cwd=ROOT, check=True,
                         capture_output=True, text=True).stdout
    data = json.loads(out)
    assert len(data["days"]) == 7, "expected 7 starter days"
    return data["days"], data["writeIns"]


title = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=18, leading=22,
                       textColor=OLIVE, alignment=TA_CENTER, spaceAfter=2)
byline = ParagraphStyle("byline", fontName="Helvetica-Bold", fontSize=10, leading=13,
                        textColor=GOLD, alignment=TA_CENTER, spaceAfter=8)
note = ParagraphStyle("note", fontName="Helvetica", fontSize=9, leading=12, textColor=MUTED)
how_head = ParagraphStyle("howhead", fontName="Helvetica-Bold", fontSize=10, leading=13,
                          textColor=OLIVE, spaceAfter=3)
how = ParagraphStyle("how", fontName="Helvetica", fontSize=10, leading=14, textColor=INK)
day_head = ParagraphStyle("day", fontName="Helvetica-Bold", fontSize=13, leading=16,
                          textColor=OLIVE, spaceBefore=12, spaceAfter=8)
body = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=14,
                      textColor=INK, spaceAfter=6)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=10, bulletIndent=-5,
                        bulletFontName="Helvetica", bulletFontSize=12,
                        bulletColor=colors.black)
write_head = ParagraphStyle("writehead", fontName="Helvetica-Bold", fontSize=8, leading=10,
                            textColor=OLIVE, spaceBefore=4, spaceAfter=2)
cal_note = ParagraphStyle("calnote", fontName="Helvetica-Bold", fontSize=9, leading=12,
                          textColor=OLIVE, spaceBefore=2)


class WriteIn(Flowable):
    """Label above, then printed line(s) with a fillable text field on top."""

    def __init__(self, name, label, lines=1, width=None, tooltip=None):
        super().__init__()
        self.name, self.label, self.lines = name, label, lines
        self.fixed_width = width
        self.tooltip = tooltip or label
        self.row = 18  # pt per writing line

    def wrap(self, availWidth, availHeight):
        self.width = self.fixed_width or availWidth
        self.height = 11 + self.row * self.lines + 4
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(GOLD)
        c.drawString(0, self.height - 8, self.label.upper())
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        top = self.height - 11
        for k in range(1, self.lines + 1):
            y = top - self.row * k
            c.line(0, y, self.width, y)
        bottom = top - self.row * self.lines
        c.acroForm.textfield(
            name=self.name, tooltip=self.tooltip,
            x=0, y=bottom + 1, width=self.width, height=self.row * self.lines - 1,
            borderWidth=0, borderColor=colors.transparent, fillColor=colors.transparent,
            textColor=INK, fontName="Helvetica", fontSize=10 if self.lines == 1 else 0,
            fieldFlags="multiline" if self.lines > 1 else "",
            relative=True,
        )


class DoneBox(Flowable):
    """Checkbox (fillable, with a printed square) + 'I completed today's job.'"""

    def __init__(self, name):
        super().__init__()
        self.name = name

    def wrap(self, availWidth, availHeight):
        self.width, self.height = availWidth, 16
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setStrokeColor(INK)
        c.setLineWidth(0.8)
        c.rect(0, 2, 11, 11)
        c.acroForm.checkbox(
            name=self.name, tooltip="I completed today’s job",
            x=0, y=2, size=11, buttonStyle="check",
            borderWidth=0, borderColor=colors.transparent, fillColor=colors.transparent,
            textColor=OLIVE, relative=True,
        )
        c.setFont("Helvetica", 9)
        c.setFillColor(MUTED)
        c.drawString(17, 4.5, "I completed today’s job.")


def write_in_block(day, spec, avail):
    fields = spec.get("fields", [])
    if not fields:
        return []
    out = [Paragraph("WRITE IT HERE", write_head)]
    if all(f.get("kind") == "time" for f in fields):
        # Day 5: Block 1 start/end, Block 2 start/end as a 2x2 grid.
        gap = 18
        col = (avail - gap) / 2
        cells = [WriteIn(f"day{day}_{f['id']}", f["label"], 1, col) for f in fields]
        rows = [cells[i:i + 2] for i in range(0, len(cells), 2)]
        t = Table(rows, colWidths=[col + gap, col])
        t.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                               ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        out.append(t)
    else:
        for f in fields:
            out.append(WriteIn(f"day{day}_{f['id']}", f["label"], 2 if f.get("kind") == "long" else 1))
            out.append(Spacer(1, 4))
    if spec.get("note"):
        out.append(Paragraph(escape(spec["note"]), cal_note))
    out.append(Spacer(1, 4))
    return out


def draw_footer(canv, doc):
    """Brand footer on every page: 'by Jeffsebiz' stays visible on any printed day."""
    canv.saveState()
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.5)
    canv.line(doc.leftMargin, 38, doc.leftMargin + doc.width, 38)
    canv.setFont("Helvetica", 8)
    canv.setFillColor(MUTED)
    canv.drawString(doc.leftMargin, 27, PAGE_FOOTER)
    canv.drawRightString(doc.leftMargin + doc.width, 27, f"Page {doc.page}")
    canv.restoreState()


def build():
    days, write_ins = load_content()
    doc = SimpleDocTemplate(
        str(OUT), pagesize=letter,
        leftMargin=54, rightMargin=54, topMargin=50.4, bottomMargin=54,
        title="Deep Focus from Home — 7-Day Starter Pack",
        author="JEFFSEBIZ LLC", subject="Free 7-day starter pack",
    )
    avail = doc.width
    box = Table([[[Paragraph("How this week works", how_head)] +
                  [Paragraph(escape(s), how) for s in PDF_HOW_IT_WORKS]]], colWidths=[avail])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BOXBG),
        ("LINEBEFORE", (0, 0), (0, -1), 3, OLIVE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story = [
        Paragraph("Deep Focus from Home — 7-Day Starter Pack", title),
        Paragraph(escape(BRAND_LINE), byline),
        box,
        Spacer(1, 8),
        Paragraph(escape(HEADER_LINE), note),
        Spacer(1, 6),
    ]
    for i, d in enumerate(days):
        n = d["day"]
        if i:
            story.append(PageBreak())  # one day per page so each day prints on its own
        part = [
            Paragraph(f"Day {n}: {escape(d['title'])}", day_head),
            Paragraph(f"<b>Job:</b> {escape(d['job'])}", body),
            Paragraph(f"<b>Why:</b> {escape(d['why'])}", body),
        ]
        for a in d["actions"]:
            part.append(Paragraph(escape(a), bullet, bulletText="•"))
        part += write_in_block(n, write_ins.get(str(n), {}), avail)
        part.append(DoneBox(f"day{n}_done"))
        part.append(Spacer(1, 4))
        # Same prompt as the app's starter page ("One line about what you actually did…").
        part.append(WriteIn(f"day{n}_note", "One line about what you actually did", 1))
        story.append(KeepTogether(part))
    story += [Spacer(1, 18), Paragraph(escape(FOOTER_LINE), note)]
    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    build()
