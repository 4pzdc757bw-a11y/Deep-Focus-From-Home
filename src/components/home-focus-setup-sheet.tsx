import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useFocusStore, type SetupState } from "@/lib/store";

const EXAMPLES = {
  location: "Spare room / kitchen corner / bedroom desk",
  surface: "Clear desk — laptop + notebook only",
  lighting: "Desk lamp on, overhead off, noise-cancelling or soft instrumental",
} as const;

type Draft = Pick<SetupState, "location" | "surface" | "lighting">;

/**
 * Week-two start-of-day: lock Home focus environment (location, surface, light/sound).
 * Skip is one tap and never blocks Today. Editable anytime under Tools → Home focus setup.
 */
export function HomeFocusSetupSheet({ onDone }: { onDone: () => void }) {
  const titleId = useId();
  const setup = useFocusStore((s) => s.setup);
  const setSetup = useFocusStore((s) => s.setSetup);
  const markPrompted = useFocusStore((s) => s.markHomeFocusWeekTwoPrompted);
  const [draft, setDraft] = useState<Draft>(() => ({
    location: setup.location,
    surface: setup.surface,
    lighting: setup.lighting,
  }));

  useEffect(() => {
    const cur = useFocusStore.getState().setup;
    setDraft({
      location: cur.location,
      surface: cur.surface,
      lighting: cur.lighting,
    });
  }, []);

  function dismiss() {
    markPrompted();
    onDone();
  }

  function save() {
    setSetup({
      location: draft.location,
      surface: draft.surface,
      lighting: draft.lighting,
    });
    markPrompted();
    onDone();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        markPrompted();
        onDone();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [markPrompted, onDone]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-olive/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Week two
        </p>
        <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
          Lock your home focus setup
        </h2>
        <p className="mt-2 text-ink">
          Week one you worked. Now lock the environment for where you’ll work
          this week — location, surface, light and sound. Skip anytime; Today is
          never blocked. Change it later in Tools.
        </p>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          <Field label="Location">
            <Input
              value={draft.location}
              onChange={(e) =>
                setDraft((d) => ({ ...d, location: e.target.value }))
              }
              placeholder={EXAMPLES.location}
              autoFocus
            />
          </Field>
          <Field label="Work-only surface">
            <Input
              value={draft.surface}
              onChange={(e) =>
                setDraft((d) => ({ ...d, surface: e.target.value }))
              }
              placeholder={EXAMPLES.surface}
            />
          </Field>
          <Field label="Light and sound">
            <Textarea
              value={draft.lighting}
              onChange={(e) =>
                setDraft((d) => ({ ...d, lighting: e.target.value }))
              }
              placeholder={EXAMPLES.lighting}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={save}>
            Save
          </Button>
          <Button type="button" variant="outline" onClick={dismiss}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
