import { chromium } from "playwright";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

const OUT = process.argv[2] || "/workspace/Household-Fridge-Poster-PREVIEW.pdf";
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";

const household = {
  hours: "9:00–12:00 and 1:30–4:00",
  signal: "Closed door · red card · headphones",
  emergency: "Hurt, fire, or you cannot find a grown-up",
  chores: "Quiet play · outdoor · snack shelf — not knocking",
  kidVersion: "When the signal is on, wait. Interrupt only for hurt or lost grown-up.",
  signedBy: "",
};

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 1600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  page.on("console", (msg) => console.log("BROWSER:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));

  await page.addInitScript((hh) => {
    try {
      localStorage.setItem("deep-focus-purchased", "1");
      localStorage.setItem("deep-focus-product", "app");
      const state = {
        state: {
          starterStart: null,
          starterDone: [],
          starterNotes: {},
          dailies: {},
          session: { running: false, slotIndex: 0, endsAt: null, phase: "idle", date: "" },
          energy: [],
          setup: {
            location: "",
            surface: "",
            lighting: "",
            blockedApps: "",
            morning: "",
            shutdown: "",
          },
          household: hh,
          weeks: {},
          months: {},
        },
        version: 3,
      };
      localStorage.setItem("deep-focus-from-home", JSON.stringify(state));
    } catch (e) {
      console.error("init storage failed", e);
    }
  }, household);

  const resp = await page.goto(`${BASE}/household`, { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log("status", resp?.status(), "url", page.url());

  await page.waitForSelector(".fridge-poster", { timeout: 30000 });
  await page.waitForSelector(".door-stop-sign", { timeout: 15000 });
  await page.waitForSelector(".household-agreement", { timeout: 15000 });
  await page.waitForSelector(".fridge-sign-line", { timeout: 15000 });
  // Ensure sample content hydrated (hours) and no filled signature names
  await page.waitForFunction(() => {
    const poster = document.querySelector(".fridge-poster");
    const foot = document.querySelector(".fridge-poster-foot");
    if (!poster || !foot) return false;
    const text = poster.textContent || "";
    const footText = foot.textContent || "";
    return text.includes("9:00") && footText.includes("Signed by") && !footText.includes("Alex");
  }, { timeout: 20000 });

  await page.screenshot({ path: "/workspace/fridge-poster-screen.png", fullPage: true });

  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: OUT,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    preferCSSPageSize: true,
  });

  const st = await stat(OUT);
  let pages = null;
  try {
    const { execFileSync } = await import("node:child_process");
    const info = execFileSync("pdfinfo", [OUT], { encoding: "utf8" });
    const m = info.match(/Pages:\s+(\d+)/);
    pages = m ? Number(m[1]) : null;
  } catch {
    pages = null;
  }
  console.log(JSON.stringify({ ok: true, out: OUT, bytes: st.size, pages }));
  if (pages != null && pages !== 3) {
    console.error("Expected 3 pages, got", pages);
    process.exitCode = 1;
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
