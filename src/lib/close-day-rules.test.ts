import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blocksNeedingDone, isDayClosed, needsDoneMessage } from "./close-day-rules.ts";
import { isWorkday, nextWorkdayFrom, workdayOnOrAfter } from "./work-hours.ts";

describe("Done before closing the day", () => {
  it("only started or ended blocks need Done", () => {
    const slots = [
      { started: true, outcomeDone: true },
      { started: true },
      { ended: true },
      {},
    ];
    assert.deepEqual(blocksNeedingDone(slots, 4), [1, 2]);
  });
  it("blocks never started never hold the day up", () => {
    assert.deepEqual(blocksNeedingDone([{}, {}, {}, {}], 4), []);
  });
  it("ignores blocks past the ones on the page", () => {
    assert.deepEqual(blocksNeedingDone([{ started: true, outcomeDone: true }, { started: true }], 1), []);
  });
  it("message names the blocks", () => {
    assert.match(needsDoneMessage(["Block 1"]), /^Click Done on Block 1 first\./);
    assert.match(needsDoneMessage(["Block 1", "Block 3"]), /Block 1 and Block 3 first/);
    assert.match(needsDoneMessage(["Block 1", "Block 2", "Block 4"]), /Block 1, Block 2 and Block 4 first/);
  });
});

describe("a day can only be closed once", () => {
  it("closed flag", () => {
    assert.equal(isDayClosed({ closed: true }), true);
    assert.equal(isDayClosed({}), false);
    assert.equal(isDayClosed(undefined), false);
  });
});

describe("work days", () => {
  it("Sunday is not a work day with Mon–Fri (or none picked)", () => {
    assert.equal(isWorkday("2026-10-11", [1, 2, 3, 4, 5]), false);
    assert.equal(isWorkday("2026-10-11", []), false);
    assert.equal(isWorkday("2026-10-12", [1, 2, 3, 4, 5]), true);
    assert.equal(isWorkday("2026-10-11", [0, 1]), true);
  });
  it("on-or-after skips a day off", () => {
    assert.equal(workdayOnOrAfter("2026-10-11", [1, 2, 3, 4, 5]), "2026-10-12");
    assert.equal(workdayOnOrAfter("2026-10-09", [1, 2, 3, 4, 5]), "2026-10-09");
  });
  it("closing a day never opens a day off", () => {
    // Closed Thursday, but it is already Sunday: opens Monday, not Sunday.
    assert.equal(nextWorkdayFrom("2026-10-08", "2026-10-11", [1, 2, 3, 4, 5]), "2026-10-12");
    // Friday → Monday still holds.
    assert.equal(nextWorkdayFrom("2026-10-09", "2026-10-09", [1, 2, 3, 4, 5]), "2026-10-12");
  });
});
