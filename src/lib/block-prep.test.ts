import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepBlockedMessage, prepHeading, prepReady } from "./block-prep.ts";

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
  it("heading wording", () => {
    assert.equal(prepHeading(3), "Check all three before you ring the bell");
    assert.equal(prepHeading(4), "Check every box before you ring the bell");
  });
  it("blocked-start message wording", () => {
    assert.equal(prepBlockedMessage(3), "Check all three boxes above before you start.");
    assert.equal(prepBlockedMessage(2), "Check every box above before you start.");
  });
});
