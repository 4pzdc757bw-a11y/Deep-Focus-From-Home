import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";
import { weekKey } from "@/lib/utils";

/**
 * Friday Close day step after next-week planning: capture this week’s review.
 * Skip is one tap and never blocks Close.
 */
export function FridayReviewSheet({ onDone }: { onDone: () => void }) {
  const titleId = useId();
  const key = weekKey();
  const stored = useFocusStore((s) => s.weeks[key]?.fridayNote ?? "");
  const patchWeek = useFocusStore((s) => s.patchWeek);
  const [note, setNote] = useState(stored);

  useEffect(() => {
    setNote(useFocusStore.getState().weeks[key]?.fridayNote ?? "");
  }, [key]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDone();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  function save() {
    patchWeek(key, { fridayNote: note });
    onDone();
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-olive/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-lg border border-yellow bg-cream p-5 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Friday review
        </p>
        <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
          What did this week’s blocks produce?
        </h2>
        <p className="mt-2 text-ink">
          One short note is enough — what worked, what to keep next week. Same
          field as Tools → Weekly planner. Skip anytime.
        </p>
        <div className="mt-3">
          <Field label="Friday review">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What the blocks produced. What to keep next week."
              autoFocus
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={save}>
            Save review
          </Button>
          <Button type="button" variant="outline" onClick={onDone}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
