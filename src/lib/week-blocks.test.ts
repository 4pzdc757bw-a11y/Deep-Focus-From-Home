import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatWeekBlock, parseWeekBlock } from "./week-blocks.ts";
import { blockDefaults, nextWorkday, nextWorkdayFrom, parseWorkHours } from "./work-hours.ts";

describe("work hours", () => {
  it("parses 24h and am/pm text", () => {
    assert.deepEqual(parseWorkHours("11:30–17:00"), { start: 690, stop: 1020 });
    assert.deepEqual(parseWorkHours("11:30 AM - 5 PM"), { start: 690, stop: 1020 });
    assert.deepEqual(parseWorkHours("9am-5pm"), { start: 540, stop: 1020 });
    assert.equal(parseWorkHours(""), null);
  });
  it("first block starts at the start of work hours, 90 min", () => {
    assert.deepEqual(blockDefaults(0, "11:30–17:00"), { start: "11:30", end: "13:00" });
    assert.deepEqual(blockDefaults(0, ""), { start: "09:00", end: "10:30" });
  });
});

describe("next workday", () => {
  it("Friday → Monday with default Mon–Fri", () => {
    assert.equal(nextWorkday("2026-10-02"), "2026-10-05");
    assert.equal(nextWorkday("2026-10-01"), "2026-10-02");
  });
  it("uses picked work days", () => {
    // Tue/Thu/Sat
    assert.equal(nextWorkday("2026-10-01", [2, 4, 6]), "2026-10-03");
    assert.equal(nextWorkday("2026-10-03", [2, 4, 6]), "2026-10-06");
  });
  it("never goes backward", () => {
    assert.equal(nextWorkdayFrom("2026-09-20", "2026-10-02"), "2026-10-02");
    assert.equal(nextWorkdayFrom("2026-10-02", "2026-10-02"), "2026-10-05");
  });
});

describe("week block text", () => {
  it("round-trips picker values", () => {
    const line = formatWeekBlock({ day: 1, start: "11:30", end: "13:00", task: "Draft chapter 2" });
    assert.equal(line, "Mon 11:30 AM–1:00 PM · Draft chapter 2");
    assert.deepEqual(parseWeekBlock(line), { day: 1, start: "11:30", end: "13:00", task: "Draft chapter 2" });
  });
  it("reads older free text", () => {
    assert.deepEqual(parseWeekBlock("Tue 9:00–10:30 · draft chapter 2"), {
      day: 2, start: "09:00", end: "10:30", task: "draft chapter 2",
    });
    assert.equal(parseWeekBlock("hardest task"), null);
  });
});
