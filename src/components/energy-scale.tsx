import { Field } from "@/components/ui/input";
import { durationMinutes } from "@/lib/chime";
import { cn } from "@/lib/utils";

/** 1–5 with half steps: 1, 1.5, … 5 — same scale as /energy */
export const ENERGY_SCALE = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export function formatEnergyScore(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function EnergyScalePicker({
  label,
  value,
  onChange,
  example,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  example?: string;
}) {
  return (
    <Field label={`${label}: ${formatEnergyScore(value)}`} hint={example}>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`${label} 1 to 5`}
      >
        {ENERGY_SCALE.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(n)}
              className={cn(
                "min-h-11 min-w-11 rounded-md border px-2 text-sm font-semibold tabular-nums transition-colors",
                selected
                  ? "border-olive bg-olive text-cream"
                  : "border-yellow bg-paper text-olive hover:border-gold",
              )}
            >
              {formatEnergyScore(n)}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/**
 * Prefill time-of-day from a Daily OS block.
 * Prefers a start–end window when the block lasted long enough; otherwise
 * morning / midday / afternoon from the start clock (stop stamps can be short).
 */
export function slotLabelFromBlock(
  slot: { start: string; end: string },
  blockIndex: number,
) {
  const start = formatClockLabel(slot.start);
  const end = formatClockLabel(slot.end);
  const mins =
    slot.start && slot.end ? durationMinutes(slot.start, slot.end) : null;
  if (start && end && mins != null && mins >= 15) return `${start}–${end}`;
  const period = periodFromClock(slot.start);
  if (period) return period;
  if (start) return `from ${start}`;
  return `Block ${blockIndex + 1}`;
}

function formatClockLabel(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return "";
  const h = Number(m[1]);
  const min = m[2];
  if (!Number.isFinite(h) || h < 0 || h > 23) return hhmm.trim();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return min === "00" ? String(hour12) : `${hour12}:${min}`;
}

function periodFromClock(hhmm: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return "";
  const h = Number(m[1]);
  if (!Number.isFinite(h)) return "";
  if (h < 11) return "Morning";
  if (h < 14) return "Midday";
  return "Afternoon";
}
