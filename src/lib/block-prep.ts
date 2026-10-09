/** Start stays locked until every "Before you ring the bell" box is ticked. */
export function prepReady(
  prep: Partial<Record<string, boolean>> | undefined,
  ids: readonly string[],
): boolean {
  if (!prep) return ids.length === 0;
  return ids.every((id) => prep[id] === true);
}

export function prepHint(count: number): string {
  return count === 3 ? "Check all three boxes to start." : "Check every box above to start.";
}
