import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/sheet-portal";
import { Field, Input } from "@/components/ui/input";
import { WeekBlocksEditor, hasAnyBlock, suggestedWeekLines } from "@/components/week-blocks-editor";
import { useFocusStore, type WeekState } from "@/lib/store";
import { nextWeekKey, prettyDate } from "@/lib/utils";

type Step = "ask" | "form";

/** Saved plan for the week, or one pre-filled from the user's own schedule. */
function emptyDraft(from: WeekState | undefined, key: string): WeekState {
  if (!hasAnyBlock(from?.blocks)) {
    return {
      theme: from?.theme ?? "",
      blocks: suggestedWeekLines(key),
      coworking: from?.coworking ?? "",
      fridayNote: from?.fridayNote ?? "",
    };
  }
  return {
    theme: from?.theme ?? "",
    blocks: [...(from?.blocks ?? [])],
    coworking: from?.coworking ?? "",
    fridayNote: from?.fridayNote ?? "",
  };
}

/**
 * Friday Close day gate: plan next week’s blocks before Friday review.
 * Skip is one tap and never blocks Close.
 */
export function WeeklyPlannerSheet({ onDone, date }: { onDone: () => void; date?: string }) {
  const titleId = useId();
  // The week after the day being closed (Fri Oct 9 → week of Oct 12), never an earlier one.
  const key = nextWeekKey(date ? new Date(`${date}T12:00:00`) : new Date());
  const stored = useFocusStore((s) => s.weeks[key]);
  const patchWeek = useFocusStore((s) => s.patchWeek);
  const markBlockSetupDone = useFocusStore((s) => s.markBlockSetupDone);
  const [step, setStep] = useState<Step>("ask");
  const [draft, setDraft] = useState<WeekState>(() => emptyDraft(stored, key));

  useEffect(() => {
    setStep("ask");
    setDraft(emptyDraft(useFocusStore.getState().weeks[key], key));
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
    // Planned their blocks: the Daily OS set-up box has done its job.
    markBlockSetupDone();
    onDone();
  }

  return (
    <SheetPortal>
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onDone}
    >
      <div
        className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
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
              Outcome + each day’s own blocks (time, length, task). Sat/Sun only
              if you need overflow — no push to work the weekend. Same fields as
              Tools → Weekly planner.
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
              <WeekBlocksEditor
                blocks={draft.blocks}
                onChange={(blocks) => setDraft((d) => ({ ...d, blocks }))}
              />
              <Field
                label="Body-doubling / coworking"
                hint="Optional. One appointment is enough."
              >
                <Input
                  value={draft.coworking}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, coworking: e.target.value }))
                  }
                  placeholder="Tue 10:00 AM · Focusmate / friend"
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
    </SheetPortal>
  );
}
