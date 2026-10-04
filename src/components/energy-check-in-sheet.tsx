import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/sheet-portal";
import { Field, Input } from "@/components/ui/input";
import {
  EnergyScalePicker,
  formatEnergyScore,
} from "@/components/energy-scale";
import { useFocusStore } from "@/lib/store";
import { TIME_OF_DAY_OPTIONS } from "@/lib/time-of-day";
import { cn, todayKey } from "@/lib/utils";

export type EnergyCheckInContext = {
  date: string;
  slotLabel: string;
  blockIndex: number;
};

type Step = "ask" | "form";

/**
 * After a focus block stops: optional energy check-in.
 * Skip is one tap and never blocks Stop — the block already finished.
 */
export function EnergyCheckInSheet({
  context,
  onDismiss,
}: {
  context: EnergyCheckInContext;
  onDismiss: () => void;
}) {
  const add = useFocusStore((s) => s.addEnergy);
  const titleId = useId();
  const [step, setStep] = useState<Step>("ask");
  const [slot, setSlot] = useState(context.slotLabel);
  const [energy, setEnergy] = useState(4);
  const [focus, setFocus] = useState(4);

  useEffect(() => {
    setStep("ask");
    setSlot(context.slotLabel);
    setEnergy(4);
    setFocus(4);
  }, [context.date, context.blockIndex, context.slotLabel]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  function save() {
    add({
      date: context.date || todayKey(),
      slot: slot.trim() || context.slotLabel || `Block ${context.blockIndex + 1}`,
      energy,
      focus,
      note: "",
    });
    onDismiss();
  }

  return (
    <SheetPortal>
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onDismiss}
    >
      <div
        className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "ask" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Block complete
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
              Log energy for this block?
            </h2>
            <p className="mt-2 text-ink">
              A quick check-in feeds your peak window on Energy. Skip anytime —
              the block is already done.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setStep("form")}>
                Log now
              </Button>
              <Button type="button" variant="outline" onClick={onDismiss}>
                Skip
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Energy check-in
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
              How was this block?
            </h2>
            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              <Field label="Time of day">
                <Input
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  placeholder="Morning / 9–11 / after lunch"
                  autoFocus
                />
              </Field>
              <div className="-mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Time of day">
                {TIME_OF_DAY_OPTIONS.map((option) => {
                  const selected = slot.trim().toLowerCase() === option.toLowerCase();
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSlot(option)}
                      className={cn(
                        "min-h-11 rounded-md border px-3 text-sm font-semibold transition-colors",
                        selected
                          ? "border-olive bg-olive text-cream"
                          : "border-yellow bg-paper text-olive hover:border-gold",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <EnergyScalePicker
                label="Energy"
                value={energy}
                onChange={setEnergy}
                example="1 drained · 3 steady · 5 charged"
              />
              <EnergyScalePicker
                label="Focus"
                value={focus}
                onChange={setFocus}
                example="1 scattered · 3 usable · 5 locked in"
              />
              <p className="text-sm text-muted">
                Selected: Energy {formatEnergyScore(energy)} · Focus{" "}
                {formatEnergyScore(focus)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={save}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={onDismiss}>
                Skip
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
    </SheetPortal>
  );
}
