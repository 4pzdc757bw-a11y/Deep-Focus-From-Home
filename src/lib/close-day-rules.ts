/**
 * Pure rules for Close day (no store, so they can be tested on their own).
 */

type BlockLike = { started?: boolean; ended?: boolean; outcomeDone?: boolean };

/**
 * Blocks on the page that were started or ended but do not have Done clicked
 * yet (0-based). Blocks that never started are not counted, so they never
 * hold up Close day.
 */
export function blocksNeedingDone(slots: readonly BlockLike[], slotCount: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < Math.min(slotCount, slots.length); i++) {
    const s = slots[i];
    if (s && (s.started || s.ended) && !s.outcomeDone) out.push(i);
  }
  return out;
}

/** Plain message naming the blocks that still need Done, e.g. "Click Done on Block 1 and Block 3 first." */
export function needsDoneMessage(labels: readonly string[]): string {
  const list =
    labels.length <= 2
      ? labels.join(" and ")
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Click Done on ${list} first. Each Done button is beside that block’s Outcome.`;
}

/** True once Close day has run for this day. */
export function isDayClosed(entry: { closed?: boolean } | undefined | null): boolean {
  return Boolean(entry?.closed);
}
