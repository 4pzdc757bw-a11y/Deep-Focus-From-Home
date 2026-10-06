import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { DayButton } from "@/components/week-slot-picker";
import { addedBlockTimes, MAX_DAY_BLOCKS } from "@/lib/block-plan";
import { useFocusStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  BLOCK_LENGTHS,
  blockLength,
  copyDayBlocks,
  dayBlocks,
  endAfter,
  formatWeekBlock,
  parseWeekBlockTimes,
  setDayBlocks,
  suggestWeekBlocks,
  type WeekBlockDraft,
} from "@/lib/week-blocks";
import {
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  clock12,
  endsNextDay,
  normalizeWorkDays,
  parseWorkHours,
  timeOptions,
  toMinutes,
  workMinutes,
} from "@/lib/work-hours";

const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const selectClass =
  "h-11 w-full rounded-md border border-yellow bg-paper px-2 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";

export function hasAnyBlock(blocks: readonly string[] | undefined) {
  return Boolean(blocks?.some((b) => b.trim()));
}

/** Week plan lines pre-filled from the user's own schedule (see suggestWeekBlocks). */
export function suggestedWeekLines(targetKey: string): string[] {
  const st = useFocusStore.getState();
  return suggestWeekBlocks({
    targetKey,
    weeks: st.weeks,
    dailies: st.dailies,
    hours: st.household?.hours,
    workDays: st.household?.workDays,
  }).map(formatWeekBlock);
}

/** "45 min", "1 h 30 min", "2 h 30 min". */
function lengthLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Every quarter hour of the day, starting at the work-day start (any start is allowed). */
function startChoices(hours: string, current: string) {
  const all = timeOptions(15);
  const from = parseWorkHours(hours)?.start ?? 6 * 60;
  const i = Math.max(0, all.findIndex((t) => (toMinutes(t) ?? 0) >= from));
  const list = [...all.slice(i), ...all.slice(0, i)];
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

type DayBlock = Omit<WeekBlockDraft, "day">;

/**
 * The week plan, one weekday at a time. Pick a day (Mon–Sun), then give that
 * day its own blocks: any start, 15 min–4 h long, a task or meeting, up to 8.
 * Days never copy from each other on their own; "Copy this day to…" only runs
 * when tapped. Free-text lines from older plans stay editable underneath.
 */
export function WeekBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const hours = useFocusStore((s) => s.household?.hours ?? "");
  const workDays = normalizeWorkDays(useFocusStore((s) => s.household?.workDays));
  const [day, setDay] = useState<number>(() => {
    const today = new Date().getDay();
    return workDays.includes(today) ? today : (WEEKDAY_ORDER.find((d) => workDays.includes(d)) ?? 1);
  });
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTo, setCopyTo] = useState<number[]>([]);
  const [copied, setCopied] = useState("");

  const mine: DayBlock[] = dayBlocks(blocks, day).map(({ block }) => ({
    start: block.start,
    end: block.end,
    task: block.task,
  }));
  const freeText = blocks
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() && !parseWeekBlockTimes(line));

  function setMine(next: DayBlock[]) {
    setCopied("");
    onChange(setDayBlocks(blocks, day, next));
  }

  function update(i: number, patch: Partial<DayBlock>) {
    setMine(mine.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  }

  function add() {
    if (mine.length >= MAX_DAY_BLOCKS) return;
    const at = (b: DayBlock) => workMinutes(b.start, hours) ?? 0;
    const last = [...mine].sort((a, b) => at(a) - at(b)).at(-1);
    const t = addedBlockTimes(last, mine.length, 90, hours);
    setMine([...mine, { start: t.start, end: t.end, task: "" }]);
  }

  function copy() {
    const targets = copyTo.filter((d) => d !== day);
    if (!targets.length) return;
    const names = targets.map((d) => WEEKDAY_SHORT[d]).join(", ");
    const replacing = targets.some((d) => dayBlocks(blocks, d).length);
    if (replacing && !window.confirm(`Replace the blocks on ${names} with ${WEEKDAY_LONG[day]}'s?`)) return;
    onChange(copyDayBlocks(blocks, day, targets));
    setCopied(`Copied ${WEEKDAY_LONG[day]} to ${names}.`);
    setCopyOpen(false);
    setCopyTo([]);
  }

  return (
    <div className="week-days-editor flex flex-col gap-3">
      <div role="tablist" aria-label="Day to set up" className="flex flex-wrap gap-1.5">
        {WEEKDAY_ORDER.map((d) => {
          const n = dayBlocks(blocks, d).length;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={day === d}
              onClick={() => {
                setDay(d);
                setCopyOpen(false);
                setCopied("");
              }}
              className={cn(
                "flex h-12 min-w-12 flex-col items-center justify-center rounded-md border px-2 text-sm font-semibold leading-tight transition-colors",
                day === d
                  ? "border-olive bg-olive text-cream"
                  : workDays.includes(d)
                    ? "border-yellow bg-paper text-olive hover:bg-cream"
                    : "border-dashed border-yellow bg-paper/60 text-muted hover:bg-cream",
              )}
            >
              {WEEKDAY_SHORT[d]}
              <span className={cn("text-xs font-normal", day === d ? "text-cream/85" : "text-muted")}>
                {n ? `${n} block${n === 1 ? "" : "s"}` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-semibold text-olive">
          {WEEKDAY_LONG[day]}: {mine.length ? `${mine.length} block${mine.length === 1 ? "" : "s"}` : "no blocks yet"}
        </p>
        <p className="text-sm text-muted">
          Just {WEEKDAY_LONG[day]}. Every other day keeps its own blocks.
          {mine.length ? null : " With none set, this day opens with 4 standard blocks."}
        </p>
      </div>

      {mine.map((b, i) => {
        const len = blockLength(b);
        const lengths = BLOCK_LENGTHS.includes(len) ? BLOCK_LENGTHS : [...BLOCK_LENGTHS, len].sort((x, y) => x - y);
        const nextDay = endsNextDay(b.start, b.end);
        return (
          <fieldset
            key={`${day}-${i}`}
            className="week-day-block flex flex-col gap-2 rounded-md border border-yellow bg-paper/60 p-3"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              {WEEKDAY_SHORT[day]} · Block {i + 1}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Starts</span>
                <select
                  className={selectClass}
                  value={b.start}
                  onChange={(e) => update(i, { start: e.target.value, end: endAfter(e.target.value, len) })}
                >
                  {startChoices(hours, b.start).map((t) => (
                    <option key={t} value={t}>
                      {clock12(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Length</span>
                <select
                  className={selectClass}
                  value={len}
                  onChange={(e) => update(i, { end: endAfter(b.start, Number(e.target.value)) })}
                >
                  {lengths.map((m) => (
                    <option key={m} value={m}>
                      {lengthLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Ends</span>
                <span className="flex h-11 items-center px-1 text-base text-ink">
                  {clock12(b.end)}
                  {nextDay ? <span className="ml-1 text-xs text-muted">(next day)</span> : null}
                </span>
              </div>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                Task or meeting (optional)
              </span>
              <Input
                value={b.task}
                placeholder="Client reports / Zoom with corporate"
                onChange={(e) => update(i, { task: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-1 self-end text-sm font-semibold text-gold"
              onClick={() => setMine(mine.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-3.5" /> Remove
            </button>
          </fieldset>
        );
      })}

      {mine.length < MAX_DAY_BLOCKS ? (
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-md border border-dashed border-yellow bg-paper px-3 text-left text-sm font-semibold text-olive"
          onClick={add}
        >
          <Plus className="size-4" /> Add a block to {WEEKDAY_LONG[day]}
          <span className="font-normal text-muted">({mine.length} of {MAX_DAY_BLOCKS})</span>
        </button>
      ) : (
        <p className="text-sm text-muted">{MAX_DAY_BLOCKS} blocks is the most for one day.</p>
      )}

      {mine.length ? (
        copyOpen ? (
          <div className="flex flex-col gap-2 rounded-md border border-yellow bg-paper p-3">
            <p className="text-sm text-ink">Copy {WEEKDAY_LONG[day]}’s blocks to:</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Copy to days">
              {WEEKDAY_ORDER.filter((d) => d !== day).map((d) => (
                <DayButton
                  key={d}
                  label={WEEKDAY_SHORT[d]}
                  pressed={copyTo.includes(d)}
                  onClick={() =>
                    setCopyTo((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
                  }
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={!copyTo.length} onClick={copy}>
                Copy
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setCopyOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-olive underline-offset-2 hover:underline"
            onClick={() => setCopyOpen(true)}
          >
            <Copy className="size-3.5" /> Copy this day to…
          </button>
        )
      ) : null}
      {copied ? <p className="text-sm text-olive">{copied}</p> : null}

      {freeText.map(({ line, index }) => (
        <Field key={`free-${index}`} label="Note from an older plan">
          <Input
            value={line}
            onChange={(e) => {
              const next = [...blocks];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
        </Field>
      ))}
    </div>
  );
}
