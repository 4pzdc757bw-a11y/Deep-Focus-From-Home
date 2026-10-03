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
    assert.equal(line, "Mon 11:00 PM–12:30 AM · Reports");
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
