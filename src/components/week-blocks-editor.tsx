import { Plus } from "lucide-react";
import { Field, Input } from "@/components/ui/input";
import { WeekSlotPicker } from "@/components/week-slot-picker";
import type { WeekState } from "@/lib/store";
import {
  formatWeekBlock,
  parseWeekBlockTimes,
  suggestWeekBlocks,
  type WeekBlockDraft,
} from "@/lib/week-blocks";
import { nextWorkday, normalizeWorkDays } from "@/lib/work-hours";
import { useFocusStore } from "@/lib/store";

const LABELS = ["Block 1", "Block 2", "Block 3", "Block 4"] as const;

export function hasAnyBlock(blocks: readonly string[] | undefined) {
  return Boolean(blocks?.some((b) => b.trim()));
}

/** Week plan lines pre-filled from the user's own schedule (see suggestWeekBlocks). */
export function suggestedWeekLines(targetKey: string): WeekState["blocks"] {
  const st = useFocusStore.getState();
  const drafts = suggestWeekBlocks({
    targetKey,
    weeks: st.weeks,
    dailies: st.dailies,
    hours: st.household?.hours,
    workDays: st.household?.workDays,
  });
  const lines = drafts.map(formatWeekBlock);
  return [lines[0] ?? "", lines[1] ?? "", lines[2] ?? "", lines[3] ?? ""];
}

/** Day after `day` (0–6) that is a work day. */
function nextWorkWeekday(day: number, workDays: readonly number[] | undefined) {
  // Any date with weekday `day` works: 2026-10-04 is a Sunday.
  const base = `2026-10-${String(4 + day).padStart(2, "0")}`;
  const next = nextWorkday(base, workDays);
  return new Date(`${next}T12:00:00`).getDay();
}

/**
 * Four weekly block rows. Readable lines get day buttons and AM/PM time
 * pickers (night shifts: ends past midnight say “(next day)”, the day is the
 * shift's start day). Free-text lines the user typed stay as text.
 */
export function WeekBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: WeekState["blocks"];
  onChange: (next: WeekState["blocks"]) => void;
}) {
  const hours = useFocusStore((s) => s.household?.hours ?? "");
  const workDays = useFocusStore((s) => s.household?.workDays);
  const firstEmpty = blocks.findIndex((b) => !b.trim());

  function set(i: number, line: string) {
    const next = [...blocks] as WeekState["blocks"];
    next[i] = line;
    onChange(next);
  }

  function add(i: number) {
    const prev = [...blocks.slice(0, i)].reverse().map(parseWeekBlockTimes).find(Boolean);
    let draft: WeekBlockDraft;
    if (prev) {
      draft = { ...prev, day: nextWorkWeekday(prev.day, normalizeWorkDays(workDays)), task: "" };
    } else {
      const st = useFocusStore.getState();
      draft = suggestWeekBlocks({
        targetKey: "",
        weeks: {},
        dailies: {},
        hours: st.household?.hours,
        workDays: st.household?.workDays,
      })[0]!;
    }
    set(i, formatWeekBlock(draft));
  }

  return (
    <>
      {blocks.map((line, i) => {
        const text = line.trim();
        if (!text) {
          return i === firstEmpty ? (
            <button
              key={i}
              type="button"
              className="flex h-11 items-center gap-2 rounded-md border border-dashed border-yellow bg-paper px-3 text-left text-sm font-semibold text-olive"
              onClick={() => add(i)}
            >
              <Plus className="size-4" /> Add {LABELS[i]}
            </button>
          ) : null;
        }
        const parsed = parseWeekBlockTimes(text);
        if (!parsed) {
          return (
            <Field key={i} label={LABELS[i] ?? `Block ${i + 1}`}>
              <Input
                value={line}
                onChange={(e) => set(i, e.target.value)}
                placeholder="Tue 9:00 AM–10:30 AM · draft chapter 2"
              />
            </Field>
          );
        }
        return (
          <div key={i} className="flex flex-col gap-1">
            <WeekSlotPicker
              label={LABELS[i] ?? `Block ${i + 1}`}
              value={parsed}
              hours={hours}
              taskPlaceholder="What you will do in this block"
              onChange={(next) => set(i, formatWeekBlock(next))}
            />
            <button
              type="button"
              className="self-end text-sm font-semibold text-gold"
              onClick={() => set(i, "")}
            >
              Remove
            </button>
          </div>
        );
      })}
    </>
  );
}
