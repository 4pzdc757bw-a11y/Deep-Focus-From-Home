import { Field } from "@/components/ui/input";
import { periodFromClock } from "@/lib/time-of-day";
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
 * Prefill time-of-day from a Daily OS block's actual start (local clock):
 * Morning before 12:00, Afternoon 12:00–16:59, Evening 17:00 and later.
 * The user can still change it in the check-in.
 */
export function slotLabelFromBlock(
  slot: { start: string; end: string },
  blockIndex: number,
) {
  const period = periodFromClock(slot.start);
  if (period) return period;
  return `Block ${blockIndex + 1}`;
}
