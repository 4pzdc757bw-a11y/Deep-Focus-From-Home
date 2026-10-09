/**
 * Owner rule: the "Log energy for this block?" prompt shows at most twice per
 * workday — after the first block that ends in the morning (before 12:00 local)
 * and after the first block that ends at 12:00 or later. Logged or skipped,
 * once shown it counts. The Energy page stays available any time.
 */
export type EnergyHalf = "am" | "pm";

export interface EnergyPromptStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = "dffh.energyPromptShown.v1";
/** Keep only the last few workdays so storage never grows. */
const KEEP_DAYS = 7;

type Shown = Record<string, Partial<Record<EnergyHalf, true>>>;

export function energyHalf(endedAt: Date): EnergyHalf {
  return endedAt.getHours() < 12 ? "am" : "pm";
}

function read(store: EnergyPromptStore | undefined): Shown {
  try {
    const raw = store?.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Shown) : {};
  } catch {
    return {};
  }
}

function defaultStore(): EnergyPromptStore | undefined {
  try {
    return typeof localStorage !== "undefined" ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** True if the prompt for this workday + half of day has not been shown yet. */
export function shouldPromptEnergy(
  workday: string,
  endedAt: Date,
  store: EnergyPromptStore | undefined = defaultStore(),
): boolean {
  return !read(store)[workday]?.[energyHalf(endedAt)];
}

/** Record that the prompt was shown (logged or skipped both count). */
export function markEnergyPrompted(
  workday: string,
  endedAt: Date,
  store: EnergyPromptStore | undefined = defaultStore(),
): void {
  if (!store) return;
  const all = read(store);
  all[workday] = { ...all[workday], [energyHalf(endedAt)]: true };
  const days = Object.keys(all).sort().slice(-KEEP_DAYS);
  const trimmed: Shown = {};
  for (const d of days) trimmed[d] = all[d];
  try {
    store.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full / blocked: prompt may show again, never blocks Stop */
  }
}

/** Check and record in one step; returns whether to show the prompt now. */
export function claimEnergyPrompt(
  workday: string,
  endedAt: Date,
  store: EnergyPromptStore | undefined = defaultStore(),
): boolean {
  if (!shouldPromptEnergy(workday, endedAt, store)) return false;
  markEnergyPrompted(workday, endedAt, store);
  return true;
}
