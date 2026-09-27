import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useFocusStore, type WeekState } from "@/lib/store";
import { nextWeekKey, prettyDate } from "@/lib/utils";

type Step = "ask" | "form";

const BLOCK_LABELS = ["Block 1", "Block 2", "Block 3", "Block 4"] as const;
const BLOCK_HINTS = [
  "Mon 9:00–10:30 · hardest task",
  "Tue 9:00–10:30 · next deep block",
  "Wed 14:00–15:30 · deep block",
  "Thu 9:00–10:30 · or Sat/Sun only if you need overflow",
] as const;

function emptyDraft(from?: WeekState): WeekState {
  return {
    theme: from?.theme ?? "",
    blocks: [
      from?.blocks[0] ?? "",
      from?.blocks[1] ?? "",
      from?.blocks[2] ?? "",
      from?.blocks[3] ?? "",
    ],
    coworking: from?.coworking ?? "",
    fridayNote: from?.fridayNote ?? "",
  };
}

/**
 * Friday Close day gate: plan next week’s blocks before Friday review.
 * Skip is one tap and never blocks Close.
 */
export function WeeklyPlannerSheet({ onDone }: { onDone: () => void }) {
  const titleId = useId();
  const key = nextWeekKey();
  const stored = useFocusStore((s) => s.weeks[key]);
  const patchWeek = useFocusStore((s) => s.patchWeek);
  const [step, setStep] = useState<Step>("ask");
  const [draft, setDraft] = useState<WeekState>(() => emptyDraft(stored));

  useEffect(() => {
    setStep("ask");
    setDraft(emptyDraft(useFocusStore.getState().weeks[key]));
  }, [key]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  function save() {
    patchWeek(key, {
      theme: draft.theme,
      blocks: draft.blocks,
      coworking: draft.coworking,
    });
    onDone();
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-olive/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg">
        {step === "ask" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Friday wind-down
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
              Plan next week before you leave?
            </h2>
            <p className="mt-2 text-ink">
              You’ve shaped daily blocks all week — you already know the rhythm.
              Name next week’s outcome and park a few Mon–Fri deep-work blocks
              now. Skip anytime; Close day is never blocked.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => setStep("form")}>
                Plan next week
              </Button>
              <Button type="button" variant="outline" onClick={onDone}>
                Skip
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Weekly work planner
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
              Week of {prettyDate(key)}
            </h2>
            <p className="mt-2 text-sm text-ink">
              Outcome + Mon–Fri blocks (day, time, task). Sat/Sun only if you
              need overflow — no push to work the weekend. Same fields as Tools →
              Weekly planner.
            </p>
            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              <Field label="Next week’s outcome" hint="One sentence for the week.">
                <Input
                  value={draft.theme}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, theme: e.target.value }))
                  }
                  placeholder="Ship the outline / close the sprint / deep research"
                  autoFocus
                />
              </Field>
              {draft.blocks.map((b, i) => (
                <Field key={i} label={BLOCK_LABELS[i] ?? `Block ${i + 1}`}>
                  <Input
                    value={b}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDraft((d) => {
                        const blocks = [...d.blocks] as WeekState["blocks"];
                        blocks[i] = value;
                        return { ...d, blocks };
                      });
                    }}
                    placeholder={BLOCK_HINTS[i]}
                  />
                </Field>
              ))}
              <Field
                label="Body-doubling / coworking"
                hint="Optional. One appointment is enough."
              >
                <Input
                  value={draft.coworking}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, coworking: e.target.value }))
                  }
                  placeholder="Tue 10:00 · Focusmate / friend"
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={save}>
                Save plan
              </Button>
              <Button type="button" variant="outline" onClick={onDone}>
                Skip
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
