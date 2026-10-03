#!/usr/bin/env python3
"""
Build the free 7-day starter pack PDF from the starter days in src/lib/content.ts.

    python3 scripts/build-starter-pdf.py            # writes public/downloads/7-day-starter-pack.pdf
    python3 scripts/build-starter-pdf.py out.pdf    # writes somewhere else

Needs Python 3 with reportlab, and Node 22+ (reads content.ts with
--experimental-strip-types). Set NODE=/path/to/node if `node` is older.
Keeps the original Sep 2026 layout: US Letter, Helvetica, olive headings.
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
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public/downloads/7-day-starter-pack.pdf"

HEADER_LINE = (
    "Phone rule: Plan the day first. During the deep-work block, park the phone off your desk. "
    "Check messages between blocks."
)
FOOTER_LINE = "Daily check (after Day 3): Phone parked for the block (off desk / out of reach)."

OLIVE = colors.HexColor("#3A4A32")
INK = colors.HexColor("#2C3528")
MUTED = colors.HexColor("#5C6B52")


def load_days():
    node = os.environ.get("NODE", "node")
    js = (
        'import("./src/lib/content.ts").then(m => '
        "process.stdout.write(JSON.stringify(m.STARTER_DAYS)))"
    )
    out = subprocess.run(
        [node, "--experimental-strip-types", "--no-warnings", "-e", js],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout
    days = json.loads(out)
    assert len(days) == 7, "expected 7 starter days"
    return days


title = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=18, leading=22,
                       textColor=OLIVE, alignment=TA_CENTER, spaceAfter=8)
note = ParagraphStyle("note", fontName="Helvetica", fontSize=9, leading=12, textColor=MUTED)
day_head = ParagraphStyle("day", fontName="Helvetica-Bold", fontSize=13, leading=16,
                          textColor=OLIVE, spaceBefore=12, spaceAfter=8)
body = ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=14,
                      textColor=INK, spaceAfter=6)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=10, bulletIndent=-5,
                        bulletFontName="Helvetica", bulletFontSize=12,
                        bulletColor=colors.black)
check = ParagraphStyle("check", parent=note, spaceBefore=0, spaceAfter=0)


def build():
    days = load_days()
    doc = SimpleDocTemplate(
        str(OUT), pagesize=letter,
        leftMargin=54, rightMargin=54, topMargin=50.4, bottomMargin=54,
        title="Deep Focus from Home — 7-Day Starter Pack",
        author="JEFFSEBIZ LLC", subject="Free 7-day starter pack",
    )
    story = [
        Paragraph("Deep Focus from Home — 7-Day Starter Pack", title),
        Paragraph(escape(HEADER_LINE), note),
        Spacer(1, 18),
    ]
    for d in days:
        story.append(Paragraph(f"Day {d['day']}: {escape(d['title'])}", day_head))
        story.append(Paragraph(f"<b>Job:</b> {escape(d['job'])}", body))
        story.append(Paragraph(f"<b>Why:</b> {escape(d['why'])}", body))
        for a in d["actions"]:
            story.append(Paragraph(escape(a), bullet, bulletText="•"))
        story.append(Paragraph('<font name="ZapfDingbats">n</font> I completed today’s job.', check))
    story += [Spacer(1, 18), Paragraph(escape(FOOTER_LINE), note)]
    doc.build(story)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    build()
