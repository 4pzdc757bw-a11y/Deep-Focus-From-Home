import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimEnergyPrompt, energyHalf, shouldPromptEnergy } from "./energy-prompt.ts";

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}
const at = (h: number, min = 0) => new Date(2026, 9, 8, h, min);

describe("energy prompt: at most twice per workday", () => {
  it("splits at noon local", () => {
    assert.equal(energyHalf(at(11, 59)), "am");
    assert.equal(energyHalf(at(12, 0)), "pm");
    assert.equal(energyHalf(at(20, 47)), "pm");
  });
  it("first morning block prompts, later morning blocks do not", () => {
    const s = mem();
    assert.equal(claimEnergyPrompt("2026-10-08", at(9), s), true);
    assert.equal(claimEnergyPrompt("2026-10-08", at(10, 30), s), false);
    assert.equal(claimEnergyPrompt("2026-10-08", at(11, 45), s), false);
  });
  it("first afternoon block prompts once, even after a morning prompt", () => {
    const s = mem();
    assert.equal(claimEnergyPrompt("2026-10-08", at(9), s), true);
    assert.equal(claimEnergyPrompt("2026-10-08", at(13), s), true);
    assert.equal(claimEnergyPrompt("2026-10-08", at(15), s), false);
    assert.equal(claimEnergyPrompt("2026-10-08", at(20, 47), s), false);
  });
  it("afternoon-only day still gets one prompt", () => {
    const s = mem();
    assert.equal(claimEnergyPrompt("2026-10-08", at(19), s), true);
    assert.equal(claimEnergyPrompt("2026-10-08", at(20), s), false);
  });
  it("resets on a new workday", () => {
    const s = mem();
    claimEnergyPrompt("2026-10-08", at(9), s);
    claimEnergyPrompt("2026-10-08", at(14), s);
    assert.equal(shouldPromptEnergy("2026-10-09", at(9), s), true);
    assert.equal(claimEnergyPrompt("2026-10-09", at(14), s), true);
  });
  it("persists through the store (reload)", () => {
    const s = mem();
    claimEnergyPrompt("2026-10-08", at(9), s);
    assert.equal(shouldPromptEnergy("2026-10-08", at(10), s), false);
  });
  it("bad stored data does not break Stop", () => {
    const s = mem();
    s.setItem("dffh.energyPromptShown.v1", "not json");
    assert.equal(claimEnergyPrompt("2026-10-08", at(9), s), true);
  });
});
