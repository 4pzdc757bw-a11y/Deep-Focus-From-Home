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

describe("each weekday has its own plan on /week", () => {
  it("setting Tuesday never touches Monday (no auto copy)", async () => {
    const { setDayBlocks, dayBlocks } = await import("./week-blocks.ts");
    const mon = setDayBlocks([], 1, [
      { start: "09:00", end: "10:30", task: "Client reports" },
      { start: "10:45", end: "11:30", task: "Email" },
    ]);
    const week = setDayBlocks(mon, 2, [
      { start: "09:00", end: "11:30", task: "Project build" }, // 2.5 h
      { start: "13:00", end: "15:00", task: "Zoom with corporate" }, // 2 h
    ]);
    assert.deepEqual(dayBlocks(week, 1).map((x) => x.block.task), ["Client reports", "Email"]);
    assert.deepEqual(
      dayBlocks(week, 2).map((x) => [x.block.start, x.block.end, x.block.task]),
      [["09:00", "11:30", "Project build"], ["13:00", "15:00", "Zoom with corporate"]],
    );
    assert.equal(dayBlocks(week, 3).length, 0);
  });
  it("weekend days and up to 8 blocks a day", async () => {
    const { setDayBlocks, dayBlocks } = await import("./week-blocks.ts");
    const ten = Array.from({ length: 10 }, (_, i) => ({ start: `${String(8 + i).padStart(2, "0")}:00`, end: `${String(8 + i).padStart(2, "0")}:45`, task: "" }));
    const week = setDayBlocks([], 6, ten);
    assert.equal(dayBlocks(week, 6).length, 8);
  });
  it("lengths from 15 min to 4 h; any start, across midnight too", async () => {
    const { BLOCK_LENGTHS, blockLength, endAfter } = await import("./week-blocks.ts");
    assert.equal(BLOCK_LENGTHS[0], 15);
    assert.equal(BLOCK_LENGTHS.at(-1), 240);
    assert.ok(BLOCK_LENGTHS.includes(45) && BLOCK_LENGTHS.includes(150) && BLOCK_LENGTHS.includes(180));
    assert.equal(endAfter("09:00", 150), "11:30");
    assert.equal(endAfter("23:00", 180), "02:00");
    assert.equal(blockLength({ start: "23:00", end: "02:00" }), 180);
    assert.equal(blockLength({ start: "09:00", end: "09:45" }), 45);
  });
  it("Copy this day to… only copies when asked, and only to the days picked", async () => {
    const { setDayBlocks, copyDayBlocks, dayBlocks } = await import("./week-blocks.ts");
    let week = setDayBlocks([], 1, [{ start: "09:00", end: "10:30", task: "Reports" }]);
    week = setDayBlocks(week, 2, [{ start: "13:00", end: "15:00", task: "Zoom" }]);
    const copied = copyDayBlocks(week, 1, [3, 4]);
    assert.deepEqual(dayBlocks(copied, 3).map((x) => x.block.task), ["Reports"]);
    assert.deepEqual(dayBlocks(copied, 4).map((x) => x.block.task), ["Reports"]);
    assert.deepEqual(dayBlocks(copied, 2).map((x) => x.block.task), ["Zoom"]);
  });
  it("free-text lines from older plans are kept", async () => {
    const { setDayBlocks } = await import("./week-blocks.ts");
    const out = setDayBlocks(["hardest task", "", "Mon 9:00 AM–10:30 AM"], 1, []);
    assert.deepEqual(out, ["hardest task"]);
  });
});

describe("a day's page starts from its own plan", () => {
  const weeks = {
    "2026-10-05": {
      blocks: [
        "Mon 9:00 AM–10:30 AM · Client reports",
        "Tue 1:00 PM–3:00 PM · Zoom with corporate",
        "Tue 9:00 AM–11:30 AM · Project build",
      ],
    },
  };
  it("Tuesday gets Tuesday's blocks in time order", () => {
    assert.deepEqual(planSlotsFor("2026-10-06", weeks, "9am-5pm"), [
      { start: "09:00", end: "11:30", task: "Project build" },
      { start: "13:00", end: "15:00", task: "Zoom with corporate" },
    ]);
  });
  it("a planned day only gets more blocks while the work day has room", async () => {
    const { planDayTimes } = await import("./block-plan.ts");
    // Tue: 9–11:30 and 1–3 → room for 3:15–4:45 only (5:00 + 1 h is past the 5 PM stop).
    assert.deepEqual(pairs(planDayTimes(planSlotsFor("2026-10-06", weeks, "9am-5pm"), "9am-5pm")), [
      ["09:00", "11:30"], ["13:00", "15:00"], ["15:15", "16:45"],
    ]);
    // Planned to the end of the day → exactly as planned.
    assert.deepEqual(pairs(planDayTimes([{ start: "09:00", end: "11:30" }, { start: "13:00", end: "17:00" }], "9am-5pm")), [
      ["09:00", "11:30"], ["13:00", "17:00"],
    ]);
    // Monday (1 block at 9) fills to 4 inside 9–5.
    assert.equal(planDayTimes(planSlotsFor("2026-10-05", weeks, "9am-5pm"), "9am-5pm").length, 4);
    // Wednesday has no plan → the 4 standard blocks.
    assert.deepEqual(planDayTimes(planSlotsFor("2026-10-07", weeks, "9am-5pm"), "9am-5pm"), defaultDayTimes(4, "9am-5pm"));
  });
});

describe("changing the day on the fly", () => {
  it("removing a block moves the later ones up and keeps 8 slots", async () => {
    const { withoutSlot } = await import("./block-plan.ts");
    const out = withoutSlot(["a", "b", "c", "d", "", "", "", ""], 1, () => "");
    assert.deepEqual(out, ["a", "c", "d", "", "", "", "", ""]);
  });
  it("Move to tomorrow: added after the last block, same length", async () => {
    const { addedBlockTimes } = await import("./block-plan.ts");
    assert.deepEqual(addedBlockTimes({ start: "14:15", end: "15:45" }, 4, 45, "9am-5pm"), { start: "16:00", end: "16:45" });
    assert.deepEqual(addedBlockTimes(undefined, 0, 150, "9am-5pm"), { start: "09:00", end: "11:30" });
  });
});
