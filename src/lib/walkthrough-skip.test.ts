import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

/** Owner decision A (Oct 11): no Skip (button or Escape) on the work-days step. */
const src = readFileSync(
  new URL("../components/getting-started-sheet.tsx", import.meta.url),
  "utf8",
);

describe("walkthrough: work-days step cannot be skipped", () => {
  it("Skip button only renders after step 1", () => {
    assert.match(src, /\{step > 0 \? \(\s*<Button variant="ghost" onClick=\{close\}>\s*Skip/);
  });
  it("Escape only closes after step 1", () => {
    assert.match(src, /e\.key === "Escape" && stepRef\.current > 0/);
  });
});
