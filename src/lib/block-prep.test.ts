import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepHint, prepReady } from "./block-prep.ts";

const IDS = ["surface", "phone", "signal"] as const;

describe("block prep gate", () => {
  it("locked with no prep", () => {
    assert.equal(prepReady(undefined, IDS), false);
  });
  it("locked until every box is ticked", () => {
    assert.equal(prepReady({ surface: true, phone: false, signal: false }, IDS), false);
    assert.equal(prepReady({ surface: true, phone: true, signal: false }, IDS), false);
    assert.equal(prepReady({ surface: true, phone: true }, IDS), false);
  });
  it("unlocked when all ticked", () => {
    assert.equal(prepReady({ surface: true, phone: true, signal: true }, IDS), true);
  });
  it("hint wording", () => {
    assert.equal(prepHint(3), "Check all three boxes to start.");
    assert.equal(prepHint(4), "Check every box above to start.");
  });
});
