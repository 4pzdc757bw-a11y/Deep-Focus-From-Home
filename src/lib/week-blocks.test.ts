import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatWeekBlock, parseWeekBlock } from "./week-blocks.ts";
import { blockDefaults, nextWorkday, nextWorkdayFrom, parseWorkHours } from "./work-hours.ts";

describe("work hours", () => {
  it("parses 24h and am/pm text", () => {
    assert.deepEqual(parseWorkHours("11:30–17:00"), { start: 690, stop: 1020, overnight: false });
    assert.deepEqual(parseWorkHours("11:30 AM - 5 PM"), { start: 690, stop: 1020, overnight: false });
    assert.deepEqual(parseWorkHours("9am-5pm"), { start: 540, stop: 1020, overnight: false });
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

/* ---------- Overnight (night-shift) work hours ---------- */
import {
  blockTimeOptions,
  endForStart,
  endLabel,
  spanMinutes,
  workdayKey,
} from "./work-hours.ts";
import { plannedMinutes, startPlan } from "./block-plan.ts";
import { durationMinutes } from "./chime.ts";
import { periodFromClock } from "./time-of-day.ts";

const NIGHT = "23:00–07:00";

describe("overnight work hours", () => {
  it("parses 11 PM – 7 AM as an overnight shift ending next morning", () => {
    assert.deepEqual(parseWorkHours(NIGHT), { start: 1380, stop: 1860, overnight: true });
    assert.deepEqual(parseWorkHours("11 PM - 7 AM"), { start: 1380, stop: 1860, overnight: true });
    // Daytime unchanged (plus the overnight flag).
    assert.deepEqual(parseWorkHours("9am-5pm"), { start: 540, stop: 1020, overnight: false });
  });
  it("default blocks: 11:00 PM → 12:30 AM, then 1:00 → 2:30 AM", () => {
    assert.deepEqual(blockDefaults(0, NIGHT), { start: "23:00", end: "00:30" });
    assert.deepEqual(blockDefaults(1, NIGHT, "00:30"), { start: "01:00", end: "02:30" });
    assert.deepEqual(blockDefaults(1, NIGHT), { start: "01:00", end: "02:30" });
    // The last block still stops at 7 AM.
    assert.deepEqual(blockDefaults(1, NIGHT, "06:00"), { start: "06:30", end: "07:00" });
  });
  it("end for a start crosses midnight and is labelled next day", () => {
    assert.equal(endForStart("23:00", NIGHT), "00:30");
    assert.equal(endForStart("06:00", NIGHT), "07:00");
    assert.equal(endLabel("23:00", "00:30"), "12:30 AM (next day)");
    assert.equal(endLabel("09:00", "10:30"), "10:30 AM");
  });
  it("picker starts cover 11 PM through the morning; ends run past midnight", () => {
    const starts = blockTimeOptions(NIGHT, "start");
    assert.equal(starts[0], "23:00");
    assert.ok(starts.includes("00:00") && starts.includes("05:30"));
    const ends = blockTimeOptions(NIGHT, "end", "23:00");
    assert.equal(ends[0], "23:15");
    assert.ok(ends.includes("00:30") && ends.includes("07:00"));
    assert.ok(!ends.includes("07:15"));
  });
  it("daytime pickers are unchanged", () => {
    const starts = blockTimeOptions("09:00–17:00", "start");
    assert.equal(starts[0], "09:00");
    assert.equal(starts.at(-1), "17:00");
    assert.deepEqual(blockTimeOptions("09:00–17:00", "end", "16:30"), ["16:45", "17:00"]);
    assert.equal(blockTimeOptions("", "start")[0], "06:00");
    assert.equal(blockTimeOptions("", "start").at(-1), "22:00");
  });
  it("durations across midnight are positive", () => {
    assert.equal(spanMinutes("23:00", "00:30"), 90);
    assert.equal(durationMinutes("23:00", "00:30"), 90);
    assert.equal(plannedMinutes("23:00", "00:30"), 90);
    assert.equal(plannedMinutes("09:00", "10:00"), 60);
  });
  it("week block line round-trips across midnight", () => {
    const line = formatWeekBlock({ day: 1, start: "23:00", end: "00:30", task: "Reports" });
    assert.equal(line, "Mon 11:00 PM–12:30 AM (next day) · Reports");
    assert.deepEqual(parseWeekBlock(line), { day: 1, start: "23:00", end: "00:30", task: "Reports" });
  });
});

describe("focus bell across midnight", () => {
  it("planned 11:00 PM → 12:30 AM rings at 12:30 AM the next day", () => {
    const now = new Date(2026, 9, 5, 23, 0, 0);
    const plan = startPlan({ start: "23:00", end: "00:30" }, now);
    assert.equal(plan.end, "00:30");
    assert.equal(plan.endsAt - now.getTime(), 90 * 60_000);
  });
  it("starting late keeps the planned length and stamps a next-day end", () => {
    const now = new Date(2026, 9, 5, 23, 50, 0);
    const plan = startPlan({ start: "23:00", end: "23:30" }, now);
    assert.equal(plan.endsAt - now.getTime(), 30 * 60_000);
    assert.equal(plan.end, "00:20");
  });
  it("daytime start keeps the planned end later today", () => {
    const now = new Date(2026, 9, 5, 9, 5, 0);
    const plan = startPlan({ start: "09:00", end: "10:30" }, now);
    assert.equal(plan.end, "10:30");
    assert.equal(plan.endsAt - now.getTime(), 85 * 60_000);
  });
});

describe("night-shift work day", () => {
  it("Mon 11 PM – Tue 7 AM is Monday's work day", () => {
    assert.equal(workdayKey(new Date(2026, 9, 5, 23, 30), NIGHT), "2026-10-05");
    assert.equal(workdayKey(new Date(2026, 9, 6, 2, 0), NIGHT), "2026-10-05");
    assert.equal(workdayKey(new Date(2026, 9, 6, 7, 0), NIGHT), "2026-10-05");
    // Afternoon before the next shift belongs to Tuesday's shift.
    assert.equal(workdayKey(new Date(2026, 9, 6, 16, 0), NIGHT), "2026-10-06");
  });
  it("daytime work day is the calendar date", () => {
    assert.equal(workdayKey(new Date(2026, 9, 6, 2, 0), "09:00–17:00"), "2026-10-06");
    assert.equal(workdayKey(new Date(2026, 9, 6, 2, 0), ""), "2026-10-06");
  });
  it("closing Monday's shift at 7 AM Tuesday opens Tuesday night's shift", () => {
    const today = workdayKey(new Date(2026, 9, 6, 7, 0), NIGHT);
    assert.equal(nextWorkdayFrom("2026-10-05", today), "2026-10-06");
    // Closing late (Tuesday 4 PM) still lands on Tuesday's shift, no double advance.
    const later = workdayKey(new Date(2026, 9, 6, 16, 0), NIGHT);
    assert.equal(nextWorkdayFrom("2026-10-05", later), "2026-10-06");
  });
  it("Friday night shift closes Saturday morning → Monday night (Mon–Fri)", () => {
    const today = workdayKey(new Date(2026, 9, 10, 7, 0), NIGHT);
    assert.equal(today, "2026-10-09");
    assert.equal(nextWorkdayFrom(today, today), "2026-10-12");
  });
  it("energy time of day: 1 AM counts as Evening, 9 AM Morning", () => {
    assert.equal(periodFromClock("01:00"), "Evening");
    assert.equal(periodFromClock("23:00"), "Evening");
    assert.equal(periodFromClock("09:00"), "Morning");
    assert.equal(periodFromClock("13:00"), "Afternoon");
  });
});

describe("starter week dates", () => {
  it("Fri start, Mon–Fri: Day 1 Fri, then next work days", async () => {
    const { starterDayDates } = await import("./work-hours.ts");
    assert.deepEqual(starterDayDates("2026-10-02", [1, 2, 3, 4, 5]), [
      "2026-10-02", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12",
    ]);
    // No days picked → Mon–Fri.
    assert.deepEqual(starterDayDates("2026-10-02", []), starterDayDates("2026-10-02", [1, 2, 3, 4, 5]));
    assert.deepEqual(starterDayDates("2026-10-02", null), starterDayDates("2026-10-02", [1, 2, 3, 4, 5]));
  });
  it("Mon–Thu worker skips Fri–Sun", async () => {
    const { starterDayDates } = await import("./work-hours.ts");
    assert.deepEqual(starterDayDates("2026-10-05", [1, 2, 3, 4]), [
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-12", "2026-10-13", "2026-10-14",
    ]);
  });
  it("Day 1 stays on a non-work start day (Sat start)", async () => {
    const { starterDayDates } = await import("./work-hours.ts");
    assert.deepEqual(starterDayDates("2026-10-03", [1, 2, 3, 4, 5]), [
      "2026-10-03", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-12",
    ]);
  });
  it("night shift: dates are shift-start days", async () => {
    const { starterDayDates, starterDayOn, workdayKey } = await import("./work-hours.ts");
    // Sun–Thu nights, 10 PM–6:30 AM. Started Sunday night.
    const nights = [0, 1, 2, 3, 4];
    const start = workdayKey(new Date(2026, 9, 4, 22, 30), "10:00 PM - 6:30 AM");
    assert.equal(start, "2026-10-04");
    const dates = starterDayDates(start, nights);
    assert.deepEqual(dates, [
      "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-11", "2026-10-12",
    ]);
    // 3 AM Tuesday is still Monday night's shift → Day 2.
    const tue3am = workdayKey(new Date(2026, 9, 6, 3, 0), "10:00 PM - 6:30 AM");
    assert.equal(starterDayOn(start, tue3am, nights), 2);
    // Friday/Saturday are days off → not a starter day.
    assert.equal(starterDayOn(start, "2026-10-09", nights), null);
  });
  it("maps dates back to day numbers", async () => {
    const { starterDayOn, starterDayDate } = await import("./work-hours.ts");
    const wd = [1, 2, 3, 4, 5];
    assert.equal(starterDayOn("2026-10-02", "2026-10-02", wd), 1);
    assert.equal(starterDayOn("2026-10-02", "2026-10-03", wd), null);
    assert.equal(starterDayOn("2026-10-02", "2026-10-05", wd), 2);
    assert.equal(starterDayOn("2026-10-02", "2026-10-12", wd), 7);
    assert.equal(starterDayOn("2026-10-02", "2026-10-13", wd), null);
    assert.equal(starterDayOn(null, "2026-10-02", wd), null);
    assert.equal(starterDayDate("2026-10-02", 7, wd), "2026-10-12");
  });
});

describe("late open moves passed blocks to now", () => {
  it("11:50 AM, Block 1 planned 9:00 → 12:00–1:30 PM", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks(
      [{ start: "09:00", end: "10:30" }], 1, "2026-10-05", "", new Date(2026, 9, 5, 11, 50),
    );
    assert.deepEqual(moves, [{ index: 0, start: "12:00", end: "13:30" }]);
  });
  it("night shift 11 PM–7 AM at 3:52 AM → 4:00–5:30 AM; Block 2 after a 30 min break", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks(
      [{ start: "23:00", end: "00:30" }, { start: "01:00", end: "02:30" }],
      2, "2026-10-02", "11 PM - 7 AM", new Date(2026, 9, 3, 3, 52),
    );
    assert.deepEqual(moves, [
      { index: 0, start: "04:00", end: "05:30" },
      { index: 1, start: "06:00", end: "07:00" }, // clamped to the 7 AM stop
    ]);
  });
  it("planned start still ahead → unchanged", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    assert.deepEqual(
      catchUpBlocks([{ start: "23:00", end: "00:30" }], 1, "2026-10-02", "11 PM - 7 AM", new Date(2026, 9, 2, 21, 0)),
      [],
    );
    assert.deepEqual(
      catchUpBlocks([{ start: "13:00", end: "14:30" }], 1, "2026-10-05", "", new Date(2026, 9, 5, 11, 50)),
      [],
    );
  });
  it("Block 2 still ahead of the moved Block 1 stays", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks(
      [{ start: "09:00", end: "10:30" }, { start: "15:00", end: "16:30" }],
      2, "2026-10-05", "9-5", new Date(2026, 9, 5, 11, 50),
    );
    assert.deepEqual(moves, [{ index: 0, start: "12:00", end: "13:30" }]);
  });
  it("rung or hand-edited blocks never move", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const now = new Date(2026, 9, 5, 11, 50);
    assert.deepEqual(catchUpBlocks([{ start: "09:00", end: "10:30", started: true }], 1, "2026-10-05", "", now), []);
    assert.deepEqual(catchUpBlocks([{ start: "09:00", end: "10:30", edited: true }], 1, "2026-10-05", "", now), []);
  });
  it("bell uses the moved times: Start at 3:55 on 4:00–5:30 rings 90 min later", () => {
    const now = new Date(2026, 9, 3, 3, 55);
    const plan = startPlan({ start: "04:00", end: "05:30" }, now);
    assert.equal(plan.endsAt - now.getTime(), 90 * 60_000);
    const at4 = new Date(2026, 9, 3, 4, 0);
    assert.equal(startPlan({ start: "04:00", end: "05:30" }, at4).end, "05:30");
  });
});

describe("block after one that ran", () => {
  it("Block 1 ended 3:54 AM → Block 2 4:15–5:45 AM (planned 1:00 passed)", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks(
      [{ start: "03:53", end: "03:54", started: true }, { start: "01:00", end: "02:30" }],
      2, "2026-10-02", "11 PM - 7 AM", new Date(2026, 9, 3, 3, 54, 30),
    );
    assert.deepEqual(moves, [{ index: 1, start: "04:15", end: "05:45" }]);
  });
  it("future planned Block 2 stays", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks(
      [{ start: "09:00", end: "10:00", started: true }, { start: "13:00", end: "14:30" }],
      2, "2026-10-05", "9-5", new Date(2026, 9, 5, 10, 0),
    );
    assert.deepEqual(moves, []);
  });
});

describe("app-moved blocks follow the block before", () => {
  it("Block 2 auto-moved to 6:00 comes back to 4:15 after Block 1 ends at 3:54", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks(
      [{ start: "03:53", end: "03:54", started: true }, { start: "06:00", end: "07:00", auto: true }],
      2, "2026-10-02", "11 PM - 7 AM", new Date(2026, 9, 3, 3, 54, 30),
    );
    assert.deepEqual(moves, [{ index: 1, start: "04:15", end: "05:45" }]);
  });
});

describe("weekly planner pre-fill", () => {
  const NIGHT_HOURS = "11:00 PM–7:00 AM";
  it("mirrors last week's night-shift plan (tasks cleared), labelled next day", async () => {
    const { suggestWeekBlocks, formatWeekBlock } = await import("./week-blocks.ts");
    const drafts = suggestWeekBlocks({
      targetKey: "2026-10-12",
      weeks: { "2026-09-28": { blocks: ["Fri 11:00 PM–12:30 AM · Reports", "Mon 1:00 AM–2:30 AM · Inbox", "", ""] } },
      dailies: {},
      hours: NIGHT_HOURS,
    });
    assert.deepEqual(drafts.map(formatWeekBlock), [
      "Fri 11:00 PM–12:30 AM (next day)",
      "Mon 1:00 AM–2:30 AM",
    ]);
  });
  it("edited week plan for the target week is not used as a source (kept by the UI)", async () => {
    const { suggestWeekBlocks } = await import("./week-blocks.ts");
    const drafts = suggestWeekBlocks({
      targetKey: "2026-10-12",
      weeks: { "2026-10-12": { blocks: ["Tue 8:00 AM–9:30 AM · mine", "", "", ""] } },
      dailies: {},
      hours: NIGHT_HOURS,
      workDays: [0, 1, 2, 3, 4],
    });
    assert.equal(drafts[0]!.start, "23:00");
  });
  it("no week plan: uses recent Today pages, per shift-start day", async () => {
    const { suggestWeekBlocks } = await import("./week-blocks.ts");
    const drafts = suggestWeekBlocks({
      targetKey: "2026-10-12",
      today: "2026-10-09",
      weeks: {},
      dailies: {
        "2026-10-05": { slots: [{ start: "23:00", end: "00:30" }] },
        "2026-10-06": { slots: [{ start: "23:30", end: "01:00" }] },
        // A block that ran at 3:53 AM uses the work-hours default, not 3:45.
        "2026-10-07": { slots: [{ start: "03:53", end: "05:23", started: true }] },
      },
      hours: NIGHT_HOURS,
    });
    assert.deepEqual(drafts, [
      { day: 1, start: "23:00", end: "00:30", task: "" },
      { day: 2, start: "23:30", end: "01:00", task: "" },
      { day: 3, start: "23:00", end: "00:30", task: "" },
    ]);
  });
  it("nothing saved: samples follow work hours, else 9:00 AM", async () => {
    const { suggestWeekBlocks } = await import("./week-blocks.ts");
    const night = suggestWeekBlocks({ targetKey: "2026-10-12", weeks: {}, dailies: {}, hours: NIGHT_HOURS, workDays: [0, 1, 2, 3, 4] });
    assert.deepEqual(night, [
      { day: 1, start: "23:00", end: "00:30", task: "" },
      { day: 3, start: "23:00", end: "00:30", task: "" },
    ]);
    const plain = suggestWeekBlocks({ targetKey: "2026-10-12", weeks: {}, dailies: {}, hours: "" });
    assert.deepEqual(plain.map((b) => [b.day, b.start, b.end]), [[1, "09:00", "10:30"], [3, "09:00", "10:30"]]);
  });
  it("reads lines with (next day) back", () => {
    assert.deepEqual(parseWeekBlock("Fri 11:00 PM–12:30 AM (next day) · Reports"), {
      day: 5, start: "23:00", end: "00:30", task: "Reports",
    });
  });
});

describe("AM/PM everywhere", () => {
  it("adds AM/PM to bare times and marks next day", async () => {
    const { withAmPm, workHoursText } = await import("./work-hours.ts");
    assert.equal(withAmPm("23:00–07:00"), "11:00 PM–7:00 AM (next day)");
    assert.equal(withAmPm("9:00–12:00 and 13:30–16:00"), "9:00 AM–12:00 PM and 1:30 PM–4:00 PM");
    assert.equal(withAmPm("9am-5pm"), "9am-5pm");
    assert.equal(withAmPm("9:00 AM–5:00 PM"), "9:00 AM–5:00 PM");
    assert.equal(workHoursText("23:00", "07:00"), "11:00 PM–7:00 AM");
    assert.deepEqual(parseWorkHours(withAmPm("23:00–07:00")), { start: 1380, stop: 1860, overnight: true });
  });
});

describe("app-filled block times", () => {
  it("never zero length: equal end becomes start + 90", async () => {
    const { withLength } = await import("./block-plan.ts");
    assert.deepEqual(withLength({ start: "04:02", end: "04:02" }), { start: "04:02", end: "05:32" });
    assert.deepEqual(withLength({ start: "23:00", end: "00:30" }), { start: "23:00", end: "00:30" });
  });
  it("Add block after a 4:02–4:02 bell block → 4:30–6:00 AM (15 min after, quarter hour)", async () => {
    const { nextBlockTimes } = await import("./block-plan.ts");
    const prev = { start: "04:02", end: "04:02", started: true };
    assert.deepEqual(nextBlockTimes(prev, 1, "11:00 PM–7:00 AM", new Date(2026, 9, 3, 4, 3)), { start: "04:30", end: "06:00" });
  });
  it("Add block uses now when later than end + 15", async () => {
    const { nextBlockTimes } = await import("./block-plan.ts");
    const prev = { start: "03:53", end: "03:54", started: true };
    assert.deepEqual(nextBlockTimes(prev, 1, "", new Date(2026, 9, 3, 4, 31)), { start: "04:45", end: "06:15" });
    // Across midnight on a night shift.
    assert.deepEqual(
      nextBlockTimes({ start: "23:00", end: "23:50", started: true }, 1, "11 PM - 7 AM", new Date(2026, 9, 2, 23, 51)),
      { start: "00:15", end: "01:45" },
    );
  });
  it("Add block on a planned (future) day: 15 min after the planned end, no clock", async () => {
    const { nextBlockTimes } = await import("./block-plan.ts");
    assert.deepEqual(nextBlockTimes({ start: "23:00", end: "00:30" }, 1, "11 PM - 7 AM", null), { start: "00:45", end: "02:15" });
  });
  it("Add block with no previous times: work-day default, never blank", async () => {
    const { nextBlockTimes } = await import("./block-plan.ts");
    assert.deepEqual(nextBlockTimes({ start: "", end: "" }, 1, "", null), { start: "11:00", end: "12:30" });
  });
  it("catch-up never produces a zero-length block", async () => {
    const { catchUpBlocks } = await import("./block-plan.ts");
    const moves = catchUpBlocks([{ start: "09:00", end: "09:00" }], 1, "2026-10-05", "", new Date(2026, 9, 5, 11, 50));
    assert.deepEqual(moves, [{ index: 0, start: "12:00", end: "13:30" }]);
  });
});

describe("new day from the week plan", () => {
  it("Wednesday uses the plan's Wednesday blocks (night shift = start day)", async () => {
    const { planSlotsFor, mondayOf } = await import("./week-blocks.ts");
    assert.equal(mondayOf("2026-10-07"), "2026-10-05");
    assert.equal(mondayOf("2026-10-11"), "2026-10-05");
    const weeks = {
      "2026-10-05": { blocks: ["Mon 11:00 PM–12:30 AM (next day) · A", "Wed 11:00 PM–12:30 AM (next day) · Reports", "Wed 1:00 AM–1:00 AM · zero", ""] },
    };
    assert.deepEqual(planSlotsFor("2026-10-07", weeks, "11 PM - 7 AM"), [
      { start: "23:00", end: "00:30", task: "Reports" },
      { start: "01:00", end: "02:30", task: "zero" },
    ]);
    assert.deepEqual(planSlotsFor("2026-10-08", weeks), []);
  });
  it("week carry-over suggestions never zero length", async () => {
    const { suggestWeekBlocks } = await import("./week-blocks.ts");
    const d = suggestWeekBlocks({ targetKey: "2026-10-12", weeks: { "2026-10-05": { blocks: ["Wed 4:00 AM–4:00 AM", "", "", ""] } }, dailies: {}, hours: "" });
    assert.deepEqual(d.map((b) => [b.start, b.end]), [["04:00", "05:30"]]);
  });
});

describe("Close day never moves backward", () => {
  it("closing Wed Oct 7 opens Thu Oct 8, not Mon Oct 5", async () => {
    const { nextDateForward, latestClosedDate } = await import("./close-day.ts");
    const wd = [1, 2, 3, 4, 5];
    assert.equal(nextDateForward("2026-10-07", "2026-10-02", wd, "2026-10-07"), "2026-10-08");
    // Closing an older day after later ones were closed still goes forward.
    assert.equal(nextDateForward("2026-10-02", "2026-10-02", wd, "2026-10-07"), "2026-10-08");
    // Friday close → Monday; never before today.
    assert.equal(nextDateForward("2026-10-09", "2026-10-02", wd, null), "2026-10-12");
    assert.equal(nextDateForward("2026-09-30", "2026-10-02", wd, null), "2026-10-02");
    assert.equal(
      latestClosedDate({ "2026-10-02": { checks: { shutdown: true } }, "2026-10-07": { checks: { shutdown: true } }, "2026-10-08": { checks: { shutdown: false } } }),
      "2026-10-07",
    );
  });
});
