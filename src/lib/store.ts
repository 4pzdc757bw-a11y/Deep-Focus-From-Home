import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { monthKey, todayKey, weekKey } from "./utils";
import type { DailyCheckId } from "./content";

export type DailySlot = {
  start: string;
  end: string;
  task: string;
  outcome: string;
};

export type DailyEntry = {
  slots: [DailySlot, DailySlot, DailySlot];
  slotCount: 1 | 2 | 3;
  checks: Record<DailyCheckId, boolean>;
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

const emptyDaily = (): DailyEntry => ({
  slots: [emptySlot("09:00", "10:30"), emptySlot(), emptySlot()],
  slotCount: 1,
  checks: {
    surface: false,
    phone: false,
    signal: false,
    block: false,
    shutdown: false,
  },
  note: "",
  partnerNote: "",
});

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

function migrateDaily(raw: Record<string, unknown>): DailyEntry {
  const base = emptyDaily();
  if (Array.isArray(raw.slots) && raw.slots.length) {
    const slots = [0, 1, 2].map((i) => {
      const s = (raw.slots as DailySlot[])[i];
      return {
        start: s?.start ?? (i === 0 ? "09:00" : ""),
        end: s?.end ?? (i === 0 ? "10:30" : ""),
        task: s?.task ?? "",
        outcome: s?.outcome ?? "",
      };
    }) as DailyEntry["slots"];
    return {
      ...base,
      slots,
      slotCount: inferSlotCount(slots, raw.slotCount),
      checks: { ...base.checks, ...(raw.checks as DailyEntry["checks"]) },
      note: String(raw.note ?? ""),
      partnerNote: String(raw.partnerNote ?? ""),
    };
  }
  const outcomes = Array.isArray(raw.outcomes) ? raw.outcomes : ["", "", ""];
  const start = String(raw.blockStart ?? "09:00");
  const end = String(raw.blockEnd ?? "10:30");
  const slots: DailyEntry["slots"] = [
    { start, end, task: "", outcome: String(outcomes[0] ?? "") },
    { start: "", end: "", task: "", outcome: String(outcomes[1] ?? "") },
    { start: "", end: "", task: "", outcome: String(outcomes[2] ?? "") },
  ];
  return {
    ...base,
    slots,
    slotCount: inferSlotCount(slots, raw.slotCount),
    checks: { ...base.checks, ...(raw.checks as DailyEntry["checks"]) },
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
        set((s) => ({ starterStart: s.starterStart ?? todayKey() })),
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
          const cur = s.dailies[date] ?? emptyDaily();
          return { dailies: { ...s.dailies, [date]: { ...cur, ...patch } } };
        }),
      patchSlot: (date, index, patch) =>
        set((s) => {
          const cur = s.dailies[date] ?? emptyDaily();
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
            { ...row, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
            ...s.energy,
          ].slice(0, 90),
        })),
      removeEnergy: (id) =>
        set((s) => ({ energy: s.energy.filter((r) => r.id !== id) })),
      setup: emptySetup(),
      setSetup: (patch) => set((s) => ({ setup: { ...s.setup, ...patch } })),
      household: emptyHousehold(),
      setHousehold: (patch) =>
        set((s) => ({ household: { ...s.household, ...patch } })),
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
        const { hydrated, ...rest } = state;
        return rest;
      },
      migrate: (persisted) => {
        const state = persisted as FocusState;
        const dailies: Record<string, DailyEntry> = {};
        for (const [k, v] of Object.entries(state.dailies ?? {})) {
          dailies[k] = migrateDaily(v as Record<string, unknown>);
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

export function useDaily(date = todayKey()) {
  const raw = useFocusStore((s) => s.dailies[date]);
  const entry = raw ? migrateDaily(raw as unknown as Record<string, unknown>) : emptyDaily();
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
