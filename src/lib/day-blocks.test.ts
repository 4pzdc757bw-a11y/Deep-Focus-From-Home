import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_DAY_BLOCKS,
  MAX_DAY_BLOCKS,
  catchUpBlocks,
  clampBlockCount,
  dayBlockCount,
  defaultDayTimes,
  fillBlankTimes,
  nextBlockTimes,
} from "./block-plan.ts";
import { planSlotsFor } from "./week-blocks.ts";

const pairs = (t: { start: string; end: string }[]) => t.map((b) => [b.start, b.end]);

describe("a new day: 4 blocks with times across the work day", () => {
  it("defaults to 4 and allows 1–8", () => {
    assert.equal(DEFAULT_DAY_BLOCKS, 4);
    assert.equal(MAX_DAY_BLOCKS, 8);
    assert.equal(clampBlockCount(undefined), 4);
    assert.equal(clampBlockCount(0), 1);
    assert.equal(clampBlockCount(3), 3);
    assert.equal(clampBlockCount(12), 8);
    assert.equal(clampBlockCount("5"), 4);
  });
  it("9–5: 9:00, 10:45, 12:30, 2:15 (90 min, 15 min between)", () => {
    assert.deepEqual(pairs(defaultDayTimes(4, "9am-5pm")), [
      ["09:00", "10:30"], ["10:45", "12:15"], ["12:30", "14:00"], ["14:15", "15:45"],
    ]);
  });
  it("no work hours: starts at 9:00 AM", () => {
    assert.deepEqual(defaultDayTimes(4, ""), defaultDayTimes(4, "9am-5pm"));
  });
  it("night shift 11 PM–7 AM runs past midnight", () => {
    assert.deepEqual(pairs(defaultDayTimes(4, "11 PM - 7 AM")), [
      ["23:00", "00:30"], ["00:45", "02:15"], ["02:30", "04:00"], ["04:15", "05:45"],
    ]);
  });
  it("8 blocks are never blank; the block that meets the stop shrinks to fit (1 h ok)", () => {
    const eight = defaultDayTimes(8, "9am-5pm");
    assert.equal(eight.length, 8);
    for (const b of eight) assert.match(`${b.start}-${b.end}`, /^\d\d:\d\d-\d\d:\d\d$/);
    assert.deepEqual(eight[4], { start: "16:00", end: "17:00" });
    assert.deepEqual(eight[5], { start: "17:15", end: "18:45" });
  });
  it("week plan blocks come first, the rest follow the last one", () => {
    const t = defaultDayTimes(4, "9am-5pm", [
      { start: "09:00", end: "10:30" },
      { start: "13:00", end: "14:30" },
    ]);
    assert.deepEqual(pairs(t), [
      ["09:00", "10:30"], ["13:00", "14:30"], ["14:45", "16:15"], ["16:30", "18:00"],
    ]);
  });
  it("week plan can put up to 4 blocks on one day (was capped at 3)", () => {
    const weeks = {
      "2026-10-05": {
        blocks: [
          "Mon 9:00 AM–10:30 AM · A",
          "Mon 11:00 AM–12:00 PM · B",
          "Mon 1:00 PM–2:00 PM · C",
          "Mon 3:00 PM–4:00 PM · D",
        ],
      },
    };
    assert.deepEqual(planSlotsFor("2026-10-05", weeks).map((b) => b.task), ["A", "B", "C", "D"]);
  });
});

describe("Add another block keeps to the work day when it can", () => {
  it("after a block ending 3:45 on a 9–5 day → 4:00–5:00", () => {
    assert.deepEqual(nextBlockTimes({ start: "14:15", end: "15:45" }, 4, "9am-5pm", null), {
      start: "16:00", end: "17:00",
    });
  });
  it("less than an hour left → a normal 90 min block after the stop", () => {
    assert.deepEqual(nextBlockTimes({ start: "15:00", end: "16:30" }, 4, "9am-5pm", null), {
      start: "16:45", end: "18:15",
    });
  });
  it("no work hours → always 90 min", () => {
    assert.deepEqual(nextBlockTimes({ start: "15:00", end: "16:30" }, 4, "", null), {
      start: "16:45", end: "18:15",
    });
  });
});

describe("days saved with 1–3 blocks", () => {
  const block = (start: string, end: string, task = "") => ({ start, end, task, outcome: "" });
  const blank = () => block("", "");

  it("open with at least 4 blocks; nothing hidden", () => {
    assert.equal(dayBlockCount([block("09:00", "10:30")], 1, true), 4);
    assert.equal(dayBlockCount([block("09:00", "10:30"), blank(), blank()], 3, true), 4);
    assert.equal(dayBlockCount([block("09:00", "10:30")], undefined, true), 4);
  });
  it("saved by the new page: the user's own count stays (Remove down to 1)", () => {
    assert.equal(dayBlockCount([block("09:00", "10:30"), blank(), blank(), blank()], 1, false), 1);
    assert.equal(dayBlockCount([], 8, false), 8);
    assert.equal(dayBlockCount([], 20, false), 8);
  });
  it("a block with text is never hidden", () => {
    const slots = [block("09:00", "10:30"), blank(), blank(), blank(), blank(), block("", "", "Invoices")];
    assert.equal(dayBlockCount(slots, 2, false), 6);
  });
  it("newly shown blocks get times after the block before (no 'Set time')", () => {
    const slots = [block("09:00", "10:30", "Report"), block("10:45", "12:15"), blank(), blank()];
    assert.deepEqual(fillBlankTimes(slots, 4, "9am-5pm"), [
      { index: 2, start: "12:30", end: "14:00" },
      { index: 3, start: "14:15", end: "15:45" },
    ]);
  });
  it("blocks that already have times, or rang, are left alone", () => {
    const slots = [{ ...block("09:02", "09:40"), started: true }, block("13:00", "14:30"), blank(), blank()];
    assert.deepEqual(fillBlankTimes(slots, 4, "9am-5pm"), [
      { index: 2, start: "14:45", end: "16:15" },
      { index: 3, start: "16:30", end: "18:00" },
    ]);
  });
});

describe("late open with 4 blocks", () => {
  it("10:20 AM on a 9–5 day: passed blocks move, still in order", () => {
    const slots = defaultDayTimes(4, "9am-5pm");
    const moves = catchUpBlocks(slots, 4, "2026-10-05", "9am-5pm", new Date(2026, 9, 5, 10, 20));
    assert.deepEqual(moves, [
      { index: 0, start: "10:30", end: "12:00" },
      { index: 1, start: "12:30", end: "14:00" },
      { index: 2, start: "14:30", end: "16:00" },
      { index: 3, start: "16:30", end: "17:00" },
    ]);
  });
});
