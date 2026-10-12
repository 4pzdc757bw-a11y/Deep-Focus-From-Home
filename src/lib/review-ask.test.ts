import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closedDaysInWeek, reviewAskDue, reviewMailto } from "./review-ask.ts";

// Week of Mon 2026-10-12 to Fri 2026-10-16.
const closed = (...days: string[]) => Object.fromEntries(days.map((d) => [d, { closed: true }]));

describe("review ask rules", () => {
  it("counts closed days only in the week of the date", () => {
    const d = { ...closed("2026-10-12", "2026-10-13", "2026-10-09"), "2026-10-14": { closed: false } };
    assert.equal(closedDaysInWeek(d, "2026-10-16"), 2);
  });
  it("no review ask before 3 closed days (the closing day counts)", () => {
    assert.equal(reviewAskDue({ asks: {}, closedBefore: 1, date: "2026-10-16" }), null);
    assert.equal(reviewAskDue({ asks: undefined, closedBefore: 2, date: "2026-10-16" }), "first");
  });
  it("asks first once, then month ask only after 28 days", () => {
    const asks = { first: "2026-10-16" };
    assert.equal(reviewAskDue({ asks, closedBefore: 4, date: "2026-10-23" }), null);
    assert.equal(reviewAskDue({ asks, closedBefore: 4, date: "2026-11-13" }), "month");
    assert.equal(reviewAskDue({ asks: { first: "2026-10-16", month: "2026-11-13" }, closedBefore: 4, date: "2026-12-18" }), null);
  });
  it("mailto carries the share choice and the rating", () => {
    const yes = decodeURIComponent(reviewMailto({ stars: 5, line: "Calmer weeks", share: true }));
    assert.match(yes, /5 out of 5/);
    assert.match(yes, /Calmer weeks/);
    assert.match(yes, /you may share/);
    const no = decodeURIComponent(reviewMailto({ stars: 3, line: "", share: false }));
    assert.match(no, /do not share/);
  });
});
