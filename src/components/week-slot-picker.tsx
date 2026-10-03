import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  blockTimeOptions,
  clock12,
  endLabel,
} from "@/lib/work-hours";
import type { WeekBlockDraft } from "@/lib/week-blocks";

const STEP = 15;
const selectClass =
  "h-11 w-full rounded-md border border-yellow bg-paper px-3 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";

/**
 * 15-min options on the work day's timeline (plus the current value). Night
 * shifts run past midnight: 11 PM … 5:30 AM starts, ends up to the stop.
 */
function optionsFor(hours: string, kind: "start" | "end", current: string, start?: string) {
  const list = blockTimeOptions(hours, kind, start, STEP);
  if (current && !list.includes(current)) list.unshift(current);
  return list;
}

/** Small toggle-style day button (also used for work days in step 1). */
export function DayButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-10 min-w-11 rounded-md border px-2 text-sm font-semibold transition-colors",
        pressed
          ? "border-olive bg-olive text-cream"
          : "border-yellow bg-paper text-olive hover:bg-cream",
      )}
    >
      {label}
    </button>
  );
}

/** Day buttons (Mon–Sun) + start/end selects + optional task, for one weekly block. */
export function WeekSlotPicker({
  label,
  value,
  hours,
  onChange,
  taskPlaceholder,
}: {
  label: string;
  value: WeekBlockDraft;
  hours: string;
  onChange: (next: WeekBlockDraft, timesEdited?: "start" | "end") => void;
  taskPlaceholder: string;
}) {
  const startOpts = optionsFor(hours, "start", value.start);
  const endOpts = optionsFor(hours, "end", value.end, value.start);
  return (
    <fieldset className="flex flex-col gap-2 rounded-md border border-yellow bg-paper/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
        {label}
      </legend>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${label} day`}>
        {WEEKDAY_ORDER.map((d) => (
          <DayButton
            key={d}
            label={WEEKDAY_SHORT[d]}
            pressed={value.day === d}
            onClick={() => onChange({ ...value, day: d })}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Starts</span>
          <select
            className={selectClass}
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value }, "start")}
          >
            {startOpts.map((t) => (
              <option key={t} value={t}>
                {clock12(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Ends</span>
          <select
            className={selectClass}
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value }, "end")}
          >
            {endOpts.map((t) => (
              <option key={t} value={t}>
                {value.start ? endLabel(value.start, t) : clock12(t)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          Task (optional)
        </span>
        <Input
          value={value.task}
          placeholder={taskPlaceholder}
          onChange={(e) => onChange({ ...value, task: e.target.value })}
        />
      </label>
    </fieldset>
  );
}
