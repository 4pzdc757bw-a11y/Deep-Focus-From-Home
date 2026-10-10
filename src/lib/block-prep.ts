/** Start won't begin or ring until every "Before you ring the bell" box is ticked. */
export function prepReady(
  prep: Partial<Record<string, boolean>> | undefined,
  ids: readonly string[],
): boolean {
  if (!prep) return ids.length === 0;
  return ids.every((id) => prep[id] === true);
}

/** Checklist heading above the prep boxes. */
export function prepHeading(count: number): string {
  return count === 3
    ? "Check all three before you ring the bell"
    : "Check every box before you ring the bell";
}

/** Shown by Start when it is tapped with boxes still unticked. */
export function prepBlockedMessage(count: number): string {
  return count === 3
    ? "Check all three boxes above before you start."
    : "Check every box above before you start.";
}
