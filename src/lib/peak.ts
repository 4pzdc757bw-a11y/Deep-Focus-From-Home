import type { EnergyRow } from "./store";

export type PeakWindow = {
  slot: string;
  score: number;
  samples: number;
};

export function peakFrom(rows: EnergyRow[]): PeakWindow | null {
  if (rows.length < 3) return null;
  const buckets = new Map<string, { sum: number; n: number; label: string }>();
  for (const row of rows) {
    const label = row.slot.trim() || "Unnamed";
    const key = label.toLowerCase();
    const cur = buckets.get(key) ?? { sum: 0, n: 0, label };
    cur.sum += (row.energy + row.focus) / 2;
    cur.n += 1;
    buckets.set(key, cur);
  }
  let best: PeakWindow | null = null;
  for (const b of buckets.values()) {
    const score = b.sum / b.n;
    if (!best || score > best.score || (score === best.score && b.n > best.samples)) {
      best = { slot: b.label, score, samples: b.n };
    }
  }
  return best;
}

export function peakLine(peak: PeakWindow | null, rows: number) {
  if (!peak) {
    return rows === 0
      ? "Log morning, afternoon, and evening. After three check-ins, this page will name your peak."
      : `Keep logging. ${rows} check-in${rows === 1 ? "" : "s"} so far — three is enough to name a peak.`;
  }
  return `Your peak looks like ${peak.slot}. Put next week’s hardest work there.`;
}
