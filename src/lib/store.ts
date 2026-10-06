import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isDateKey, monthKey, weekKey } from "./utils";
import { endForStart, endsNextDay, workdayKey } from "./work-hours";
import { planSlotsFor } from "./week-blocks";
import {
  DAY_BLOCKS_LAYOUT,
  MAX_DAY_BLOCKS,
  dayBlockCount,
  defaultDayTimes,
  fillBlankTimes,
} from "./block-plan";
import type { BlockPrepId, DailyCheckId, ShutdownStepId } from "./content";

export type BlockPrep = Record<BlockPrepId, boolean>;

export type DailySlot = {
  start: string;
  end: string;
  task: string;
  outcome: string;
  /** "Before you ring the bell" ticks for this block. */
  prep?: BlockPrep;
  /** Bell rung for this block (its times are real, never auto-moved). */
  started?: boolean;
  /** User changed the times by hand (never auto-moved). */
  edited?: boolean;
  /** Times were moved by the app (catch-up); they follow the block before. */
  auto?: boolean;
};

export const emptyPrep = (): BlockPrep => ({ surface: false, phone: false, signal: false });

export const emptyShutdownSteps = (): Record<ShutdownStepId, boolean> => ({
  outcomes: false,
  loops: false,
  apps: false,
  space: false,
});

function readShutdownSteps(raw: unknown): Record<ShutdownStepId, boolean> {
  const base = emptyShutdownSteps();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(base) as ShutdownStepId[]) base[k] = Boolean(r[k]);
  return base;
}

function readPrep(raw: unknown): BlockPrep | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  return { surface: Boolean(r.surface), phone: Boolean(r.phone), signal: Boolean(r.signal) };
}

export type DailyEntry = {
  /** Always MAX_DAY_BLOCKS (8) slots; the first `slotCount` are on the page. */
  slots: DailySlot[];
  /** Blocks on the page, 1–8 (a new day shows 4). */
  slotCount: number;
  /**
   * DAY_BLOCKS_LAYOUT (2) once saved by the 4–8 block page. Older saves (no
   * marker, slotCount 1–3) open with at least 4 blocks; after that the
   * user's own count (Remove down to 1) is kept.
   */
  blocksLayout?: number;
  /**
   * Day-level checks. `block` (auto when a start bell rings) and `shutdown`
   * (end of day) are live; surface/phone/signal are legacy — they now live
   * per block in `slot.prep` and old values seed Block 1 (see migrateDaily).
   */
  checks: Record<DailyCheckId, boolean>;
  /** Handbook shutdown steps ticked today (all ticked → checks.shutdown). */
  shutdownSteps: Record<ShutdownStepId, boolean>;
  note: string;
  partnerNote: string;
  /** "Other things I did today": anything beyond the blocks. */
  otherNote: string;
};

export type SessionState = {
  running: boolean;
  slotIndex: number;
  endsAt: number | null;
  phase: "idle" | "live" | "done";
  date: string;
};

export type EnergyRow = {
  id: string;
  date: string;
  slot: string;
  energy: number;
  focus: number;
  note: string;
  /** When it was saved (ms). Older rows fall back to the time in `id`. */
  at?: number;
};

export type SetupState = {
  location: string;
  surface: string;
  lighting: string;
  blockedApps: string;
  morning: string;
  shutdown: string;
};

export type HouseholdState = {
  hours: string;
  signal: string;
  emergency: string;
  chores: string;
  kidVersion: string;
  signedBy: string;
  /** Work days picked in Getting started (0 = Sun … 6 = Sat). Unset → Mon–Fri. */
  workDays?: number[];
};

export type WeekState = {
  theme: string;
  blocks: [string, string, string, string];
  coworking: string;
  fridayNote: string;
};

export type MonthState = {
  worked: string;
  friction: string;
  keep: string;
  drop: string;
  nextPeak: string;
};

type FocusState = {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  starterStart: string | null;
  starterDone: number[];
  starterNotes: Record<number, string>;
  startStarter: () => void;
  /** Move week one to start on `date` (YYYY-MM-DD). */
  setStarterStart: (date: string) => void;
  toggleStarterDay: (day: number) => void;
  setStarterNote: (day: number, note: string) => void;
  dailies: Record<string, DailyEntry>;
  patchDaily: (date: string, patch: Partial<DailyEntry>) => void;
  patchSlot: (date: string, index: number, patch: Partial<DailySlot>) => void;
  session: SessionState;
  setSession: (patch: Partial<SessionState>) => void;
  energy: EnergyRow[];
  addEnergy: (row: Omit<EnergyRow, "id">) => void;
  removeEnergy: (id: string) => void;
  setup: SetupState;
  setSetup: (patch: Partial<SetupState>) => void;
  /** True after Save/Skip on the week-two Home focus setup prompt (once). */
  homeFocusWeekTwoPrompted: boolean;
  markHomeFocusWeekTwoPrompted: () => void;
  /** True after the first-open walkthrough is finished or skipped. */
  tourDone: boolean;
  setTourDone: (v: boolean) => void;
  /** Not saved: true while the walkthrough is replaying from Tools. */
  tourOpen: boolean;
  setTourOpen: (v: boolean) => void;
  household: HouseholdState;
  setHousehold: (patch: Partial<HouseholdState>) => void;
  weeks: Record<string, WeekState>;
  patchWeek: (key: string, patch: Partial<WeekState>) => void;
  months: Record<string, MonthState>;
  patchMonth: (key: string, patch: Partial<MonthState>) => void;
};

export const emptySlot = (start = "", end = ""): DailySlot => ({
  start,
  end,
  task: "",
  outcome: "",
});

/**
 * New day: 4 blocks (more if the week plan has more for that weekday), with
 * times filled in: the week plan's blocks first (times and tasks), else
 * Block 1 at the start of the work day (9:00 AM if unset); the rest follow
 * 15 min after the block before.
 */
const emptyDaily = (
  hours?: string,
  date?: string,
  weeks?: Record<string, { blocks: readonly string[] } | undefined>,
): DailyEntry => {
  const plan = date && weeks ? planSlotsFor(date, weeks) : [];
  const count = dayBlockCount([], plan.length, true);
  const times = defaultDayTimes(count, hours, plan);
  const slots = Array.from({ length: MAX_DAY_BLOCKS }, (_, i) => {
    const t = times[i];
    return t ? { ...emptySlot(t.start, t.end), task: plan[i]?.task ?? "" } : emptySlot();
  });
  return {
  slots,
  slotCount: count,
  blocksLayout: DAY_BLOCKS_LAYOUT,
  checks: {
    surface: false,
    phone: false,
    signal: false,
    block: false,
    shutdown: false,
  },
  shutdownSteps: emptyShutdownSteps(),
  note: "",
  partnerNote: "",
  otherNote: "",
  };
};

const emptySetup = (): SetupState => ({
  location: "",
  surface: "",
  lighting: "",
  blockedApps: "",
  morning: "",
  shutdown: "",
});

const emptyHousehold = (): HouseholdState => ({
  hours: "",
  signal: "",
  emergency: "",
  chores: "",
  kidVersion: "",
  signedBy: "",
});

const emptyWeek = (): WeekState => ({
  theme: "",
  blocks: ["", "", "", ""],
  coworking: "",
  fridayNote: "",
});

const emptyMonth = (): MonthState => ({
  worked: "",
  friction: "",
  keep: "",
  drop: "",
  nextPeak: "",
});

/**
 * Saved (or imported) day → current shape. Always 8 slots; days saved before
 * the 4–8 block page open with at least 4 blocks, the new ones prefilled
 * after the block before. Nothing saved is dropped.
 */
export function migrateDaily(raw: Record<string, unknown>, hours?: string): DailyEntry {
  const base = emptyDaily(hours);
  const legacyLayout = raw.blocksLayout !== DAY_BLOCKS_LAYOUT;
  if (Array.isArray(raw.slots) && raw.slots.length) {
    const legacy = (raw.checks ?? {}) as Partial<Record<DailyCheckId, boolean>>;
    const slots = Array.from({ length: MAX_DAY_BLOCKS }, (_, i) => {
      const s = (raw.slots as (DailySlot | null)[])[i];
      // Old saves kept surface/phone/signal once per day: carry them onto Block 1.
      const prep =
        readPrep(s?.prep) ??
        (i === 0
          ? {
              surface: Boolean(legacy.surface),
              phone: Boolean(legacy.phone),
              signal: Boolean(legacy.signal),
            }
          : emptyPrep());
      const start = s?.start ?? (i === 0 ? base.slots[0].start : "");
      let end = s?.end ?? (i === 0 ? base.slots[0].end : "");
      // Older builds capped block ends at 11:59 PM (so 11 PM starts got 59 min).
      // Give those the real 90-minute end past midnight (11:00 PM → 12:30 AM).
      if (end === "23:59" && start) {
        const fixed = endForStart(start, hours);
        if (fixed && endsNextDay(start, fixed)) end = fixed;
      }
      return {
        start,
        end,
        task: s?.task ?? "",
        outcome: s?.outcome ?? "",
        prep,
        ...(s?.started ? { started: true } : {}),
        ...(s?.edited ? { edited: true } : {}),
        ...(s?.auto ? { auto: true } : {}),
      };
    }) as DailyEntry["slots"];
    return finishDaily(base, slots, raw, legacyLayout, hours);
  }
  const outcomes = Array.isArray(raw.outcomes) ? raw.outcomes : ["", "", ""];
  const start = String(raw.blockStart ?? base.slots[0].start);
  const end = String(raw.blockEnd ?? base.slots[0].end);
  const slots: DailyEntry["slots"] = [
    {
      start,
      end,
      task: "",
      outcome: String(outcomes[0] ?? ""),
      prep: readPrep(raw.checks) ?? emptyPrep(),
    },
    { start: "", end: "", task: "", outcome: String(outcomes[1] ?? "") },
    { start: "", end: "", task: "", outcome: String(outcomes[2] ?? "") },
    ...Array.from({ length: MAX_DAY_BLOCKS - 3 }, () => emptySlot()),
  ];
  return finishDaily(base, slots, raw, true, hours);
}

function finishDaily(
  base: DailyEntry,
  slots: DailyEntry["slots"],
  raw: Record<string, unknown>,
  legacyLayout: boolean,
  hours?: string,
): DailyEntry {
  const slotCount = dayBlockCount(slots, raw.slotCount, legacyLayout);
  // Older days now showing 4+: the newly shown blocks get times after the one before.
  if (legacyLayout) {
    for (const fill of fillBlankTimes(slots, slotCount, hours)) {
      slots[fill.index] = { ...slots[fill.index]!, start: fill.start, end: fill.end };
    }
  }
  return {
    ...base,
    slots,
    slotCount,
    blocksLayout: DAY_BLOCKS_LAYOUT,
    checks: { ...base.checks, ...(raw.checks as DailyEntry["checks"]) },
    shutdownSteps: readShutdownSteps(raw.shutdownSteps),
    note: String(raw.note ?? ""),
    partnerNote: String(raw.partnerNote ?? ""),
    otherNote: String(raw.otherNote ?? ""),
  };
}

/** The saved day in the current shape (8 slots, 1–8 visible), or a new day. */
function currentDaily(s: Pick<FocusState, "dailies" | "household" | "weeks">, date: string) {
  const raw = s.dailies[date];
  return raw
    ? migrateDaily(raw as unknown as Record<string, unknown>, s.household?.hours)
    : emptyDaily(s.household?.hours, date, s.weeks);
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set) => ({
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      starterStart: null,
      starterDone: [],
      starterNotes: {},
      startStarter: () =>
        set((s) => ({ starterStart: s.starterStart ?? workdayKey(new Date(), s.household?.hours) })),
      setStarterStart: (date) =>
        set(() => (isDateKey(date) ? { starterStart: date } : {})),
      toggleStarterDay: (day) =>
        set((s) => ({
          starterDone: s.starterDone.includes(day)
            ? s.starterDone.filter((d) => d !== day)
            : [...s.starterDone, day].sort((a, b) => a - b),
        })),
      setStarterNote: (day, note) =>
        set((s) => ({ starterNotes: { ...s.starterNotes, [day]: note } })),
      dailies: {},
      // Writes go through the current shape, so a day saved with 1–3 blocks is
      // stored with its 4+ blocks (and marker) on the first edit.
      patchDaily: (date, patch) =>
        set((s) => {
          const cur = currentDaily(s, date);
          return { dailies: { ...s.dailies, [date]: { ...cur, ...patch } } };
        }),
      patchSlot: (date, index, patch) =>
        set((s) => {
          if (index < 0 || index >= MAX_DAY_BLOCKS) return {};
          const cur = currentDaily(s, date);
          const slots = [...cur.slots] as DailyEntry["slots"];
          slots[index] = { ...emptySlot(), ...slots[index], ...patch };
          return { dailies: { ...s.dailies, [date]: { ...cur, slots } } };
        }),
      session: { running: false, slotIndex: 0, endsAt: null, phase: "idle", date: "" },
      setSession: (patch) =>
        set((s) => ({ session: { ...s.session, ...patch } })),
      energy: [],
      addEnergy: (row) =>
        set((s) => ({
          energy: [
            {
              ...row,
              at: row.at ?? Date.now(),
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            },
            ...s.energy,
          ].slice(0, 90),
        })),
      removeEnergy: (id) =>
        set((s) => ({ energy: s.energy.filter((r) => r.id !== id) })),
      setup: emptySetup(),
      setSetup: (patch) => set((s) => ({ setup: { ...s.setup, ...patch } })),
      homeFocusWeekTwoPrompted: false,
      markHomeFocusWeekTwoPrompted: () => set({ homeFocusWeekTwoPrompted: true }),
      tourDone: false,
      setTourDone: (v) => set({ tourDone: v }),
      tourOpen: false,
      setTourOpen: (v) => set({ tourOpen: v }),
      household: emptyHousehold(),
      setHousehold: (patch) =>
        set((s) => {
          const household = { ...s.household, ...patch };
          if (patch.hours === undefined || patch.hours === s.household.hours) {
            return { household };
          }
          // Work hours changed: move the blocks of today and later days to the
          // new work day, but only while they are still the untouched old
          // defaults (Block 1 at the start, the rest following it), stopping
          // at the first block the user typed in, edited or rang.
          const oldDefs = defaultDayTimes(MAX_DAY_BLOCKS, s.household.hours);
          const newDefs = defaultDayTimes(MAX_DAY_BLOCKS, household.hours);
          const today = workdayKey(new Date(), household.hours);
          let dailies = s.dailies;
          for (const [date, saved] of Object.entries(s.dailies)) {
            if (date < today || !saved?.slots?.length) continue;
            if (s.session.running && s.session.date === date) continue;
            const entry = migrateDaily(saved as unknown as Record<string, unknown>, s.household.hours);
            const slots = [...entry.slots] as DailyEntry["slots"];
            let moved = false;
            for (let i = 0; i < entry.slotCount; i++) {
              const slot = slots[i]!;
              const oldDef = oldDefs[i]!;
              const newDef = newDefs[i]!;
              if (slot.task || slot.outcome || slot.started || slot.edited) break;
              if (slot.start !== oldDef.start || slot.end !== oldDef.end) break;
              slots[i] = { ...slot, start: newDef.start, end: newDef.end };
              moved = true;
            }
            if (!moved) continue;
            if (dailies === s.dailies) dailies = { ...s.dailies };
            dailies[date] = { ...entry, slots };
          }
          return { household, dailies };
        }),
      weeks: {},
      patchWeek: (key, patch) =>
        set((s) => {
          const cur = s.weeks[key] ?? emptyWeek();
          return { weeks: { ...s.weeks, [key]: { ...cur, ...patch } } };
        }),
      months: {},
      patchMonth: (key, patch) =>
        set((s) => {
          const cur = s.months[key] ?? emptyMonth();
          return { months: { ...s.months, [key]: { ...cur, ...patch } } };
        }),
    }),
    {
      name: "deep-focus-from-home",
      skipHydration: true,
      version: 3,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        try {
          const k = "__df_probe";
          window.localStorage.setItem(k, "1");
          window.localStorage.removeItem(k);
          return window.localStorage;
        } catch {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
      partialize: (state) => {
        const { hydrated, tourOpen, ...rest } = state;
        return rest;
      },
      migrate: (persisted) => {
        const state = persisted as FocusState;
        const dailies: Record<string, DailyEntry> = {};
        for (const [k, v] of Object.entries(state.dailies ?? {})) {
          dailies[k] = migrateDaily(
            v as Record<string, unknown>,
            (state.household as HouseholdState | undefined)?.hours,
          );
        }
        const prev = state.session ?? {
          running: false,
          slotIndex: 0,
          endsAt: null,
          phase: "idle" as const,
          date: "",
        };
        return {
          ...state,
          dailies,
          session: {
            running: prev.running ?? false,
            slotIndex: prev.slotIndex ?? 0,
            endsAt: prev.endsAt ?? null,
            phase: prev.phase ?? "idle",
            date: prev.date ?? "",
          },
        };
      },
    },
  ),
);

export function useDaily(day?: string) {
  const hours = useFocusStore((s) => s.household?.hours);
  // Default: the current work day (a night shift's small hours count as the evening before).
  const date = day ?? workdayKey(new Date(), hours);
  const raw = useFocusStore((s) => s.dailies[date]);
  const weeks = useFocusStore((s) => s.weeks);
  const entry = raw
    ? migrateDaily(raw as unknown as Record<string, unknown>, hours)
    : emptyDaily(hours, date, weeks);
  const patchDaily = useFocusStore((s) => s.patchDaily);
  const patchSlot = useFocusStore((s) => s.patchSlot);
  return {
    date,
    entry,
    patch: (p: Partial<DailyEntry>) => patchDaily(date, p),
    patchSlot: (i: number, p: Partial<DailySlot>) => patchSlot(date, i, p),
  };
}

export function useWeek(date = new Date()) {
  const key = weekKey(date);
  const entry = useFocusStore((s) => s.weeks[key]) ?? emptyWeek();
  const patchWeek = useFocusStore((s) => s.patchWeek);
  return { key, entry, patch: (p: Partial<WeekState>) => patchWeek(key, p) };
}

export function useMonth(date = new Date()) {
  const key = monthKey(date);
  const entry = useFocusStore((s) => s.months[key]) ?? emptyMonth();
  const patchMonth = useFocusStore((s) => s.patchMonth);
  return { key, entry, patch: (p: Partial<MonthState>) => patchMonth(key, p) };
}
