import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

/** Jeffrey: customers "click" (never "tick") on every page and in the app. */
const FILES = [
  "../routes/starter.tsx",
  "../components/getting-started-sheet.tsx",
  "../components/daily-os.tsx",
  "../components/week-rating-sheet.tsx",
];

describe("customer wording: click, never tick", () => {
  for (const rel of FILES) {
    it(`${rel} has no visible 'tick'`, () => {
      const lines = readFileSync(new URL(rel, import.meta.url), "utf8").split("\n");
      const visible = lines.filter(
        (l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/\{\/\*.*\*\/\}\s*$/.test(l),
      );
      const hits = visible.filter((l) => /\btick(s|ed|ing)?\b/i.test(l.replace(/\/\/.*$/, "")));
      assert.deepEqual(hits, []);
    });
  }
});
