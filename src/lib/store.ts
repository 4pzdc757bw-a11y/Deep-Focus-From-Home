import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isDateKey, monthKey, weekKey } from "./utils";
import { blockDefaults, endForStart, endsNextDay, workdayKey } from "./work-hours";
import { planSlotsFor } from "./week-blocks";
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
  slots: [DailySlot, DailySlot, DailySlot];
  slotCount: 1 | 2 | 3;
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

function slotHasContent(slot?: DailySlot) {
  if (!slot) return false;
  return Boolean(slot.start || slot.end || slot.task || slot.outcome);
}

function inferSlotCount(slots: DailyEntry["slots"], stored?: unknown): 1 | 2 | 3 {
  let n: 1 | 2 | 3 = 1;
  if (slotHasContent(slots[1])) n = 2;
  if (slotHasContent(slots[2])) n = 3;
  if (stored === 2 || stored === 3) n = n > stored ? n : stored;
  return n;
}

/**
 * New day: the week plan's blocks for that weekday when there are any (times
 * and tasks), else Block 1 at the start of the work day (9:00 AM if unset).
 */
const emptyDaily = (
  hours?: string,
  date?: string,
  weeks?: Record<string, { blocks: readonly string[] } | undefined>,
): DailyEntry => {
  const plan = date && weeks ? planSlotsFor(date, weeks) : [];
  const first = plan[0] ?? blockDefaults(0, hours);
  const slot = (p?: { start: string; end: string; task?: string }) =>
    p ? { ...emptySlot(p.start, p.end), task: p.task ?? "" } : emptySlot();
  return {
  slots: [slot({ ...first, task: plan[0]?.task ?? "" }), slot(plan[1]), slot(plan[2])],
  slotCount: Math.min(3, Math.max(1, plan.length)) as 1 | 2 | 3,
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

function migrateDaily(raw: Record<string, unknown>, hours?: string): DailyEntry {
  const base = emptyDaily(hours);
  if (Array.isArray(raw.slots) && raw.slots.length) {
    const legacy = (raw.checks ?? {}) as Partial<Record<DailyCheckId, boolean>>;
    const slots = [0, 1, 2].map((i) => {
      const s = (raw.slots as DailySlot[])[i];
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
    return {
      ...base,
      slots,
      slotCount: inferSlotCount(slots, raw.slotCount),
      checks: { ...base.checks, ...(raw.checks as DailyEntry["checks"]) },
      shutdownSteps: readShutdownSteps(raw.shutdownSteps),
      note: String(raw.note ?? ""),
      partnerNote: String(raw.partnerNote ?? ""),
    };
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
  ];
  return {
    ...base,
    slots,
    slotCount: inferSlotCount(slots, raw.slotCount),
    checks: { ...base.checks, ...(raw.checks as DailyEntry["checks"]) },
    shutdownSteps: readShutdownSteps(raw.shutdownSteps),
    note: String(raw.note ?? ""),
    partnerNote: String(raw.partnerNote ?? ""),
  };
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
      patchDaily: (date, patch) =>
        set((s) => {
          const cur = s.dailies[date] ?? emptyDaily(s.household?.hours, date, s.weeks);
          return { dailies: { ...s.dailies, [date]: { ...cur, ...patch } } };
        }),
      patchSlot: (date, index, patch) =>
        set((s) => {
          const cur = s.dailies[date] ?? emptyDaily(s.household?.hours, date, s.weeks);
          const slots = [...cur.slots] as DailyEntry["slots"];
          slots[index] = { ...slots[index], ...patch };
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
          // Work hours changed: move Block 1 of today and later days to the new
          // start, but only where it is still the untouched old default.
          const oldDef = blockDefaults(0, s.household.hours);
          const newDef = blockDefaults(0, household.hours);
          const today = workdayKey(new Date(), household.hours);
          let dailies = s.dailies;
          for (const [date, entry] of Object.entries(s.dailies)) {
            if (date < today) continue;
            const slot = entry?.slots?.[0];
            if (!slot || slot.task || slot.outcome) continue;
            if (s.session.running && s.session.date === date) continue;
            if (slot.start !== oldDef.start || slot.end !== oldDef.end) continue;
            const slots = [...entry.slots] as DailyEntry["slots"];
            slots[0] = { ...slot, start: newDef.start, end: newDef.end };
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
