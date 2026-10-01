import { useEffect, useId, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/sheet-portal";
import { Field, Input } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";
import { playDoneBell, playStartBell } from "@/lib/chime";
import { todayKey, weekKey } from "@/lib/utils";

const STEPS = [
  "Your work hours",
  "This week’s focus blocks",
  "Your first focus block",
  "The start and end bell",
  "Close out the day",
] as const;

function splitHours(hours: string): [string, string] {
  const m = hours.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
  return m ? [m[1].padStart(5, "0"), m[2].padStart(5, "0")] : ["09:00", "17:00"];
}

/**
 * First-open walkthrough: five short steps, one at a time.
 * Every step saves into the real pages (Household hours, This week, Today).
 * Skip is always one tap. Replay from Tools.
 */
export function GettingStartedSheet({ onDone }: { onDone: () => void }) {
  const titleId = useId();
  const [step, setStep] = useState(0);

  const household = useFocusStore((s) => s.household);
  const setHousehold = useFocusStore((s) => s.setHousehold);
  const wk = weekKey();
  const patchWeek = useFocusStore((s) => s.patchWeek);
  const patchSlot = useFocusStore((s) => s.patchSlot);
  const startStarter = useFocusStore((s) => s.startStarter);
  const setTourDone = useFocusStore((s) => s.setTourDone);
  const setTourOpen = useFocusStore((s) => s.setTourOpen);

  const [hours, setHours] = useState<[string, string]>(() => splitHours(household.hours));
  const [blocks, setBlocks] = useState<[string, string]>(() => {
    const w = useFocusStore.getState().weeks[wk];
    return [w?.blocks[0] ?? "", w?.blocks[1] ?? ""];
  });
  const [first, setFirst] = useState(() => {
    const d = useFocusStore.getState().dailies[todayKey()]?.slots[0];
    return { task: d?.task ?? "", start: d?.start || "09:00", end: d?.end || "10:30" };
  });

  function close() {
    setTourDone(true);
    setTourOpen(false);
    onDone();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveStep() {
    if (step === 0) setHousehold({ hours: `${hours[0]}–${hours[1]}` });
    if (step === 1) {
      const cur = useFocusStore.getState().weeks[wk]?.blocks ?? ["", "", "", ""];
      patchWeek(wk, { blocks: [blocks[0], blocks[1], cur[2] ?? "", cur[3] ?? ""] });
    }
    if (step === 2) {
      patchSlot(todayKey(), 0, { task: first.task, start: first.start, end: first.end });
    }
  }

  function next() {
    saveStep();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    startStarter();
    close();
  }

  const last = step === STEPS.length - 1;

  return (
    <SheetPortal>
      <div
        className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Getting started · Step {step + 1} of {STEPS.length}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sage">
            <div
              className="h-full bg-olive transition-[width] duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <h2 id={titleId} className="mt-4 font-display text-2xl text-olive">
            {STEPS[step]}
          </h2>

          <div className="mt-3 flex min-h-0 flex-col gap-4 overflow-y-auto text-ink">
            {step === 0 ? (
              <>
                <p>When does your work day start and stop? This sets the edges. Outside these hours, you’re off.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start">
                    <Input type="time" value={hours[0]} onChange={(e) => setHours([e.target.value, hours[1]])} />
                  </Field>
                  <Field label="Stop">
                    <Input type="time" value={hours[1]} onChange={(e) => setHours([hours[0], e.target.value])} />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <p>Pick two times this week for your hardest work. Just two to start. You can add more on the This week page.</p>
                <Field label="Block 1">
                  <Input value={blocks[0]} placeholder="Mon 9:00–10:30 · hardest task" onChange={(e) => setBlocks([e.target.value, blocks[1]])} />
                </Field>
                <Field label="Block 2">
                  <Input value={blocks[1]} placeholder="Wed 9:00–10:30 · next deep block" onChange={(e) => setBlocks([blocks[0], e.target.value])} />
                </Field>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <p>What’s the one thing you’ll focus on today? One task, one time slot. It goes straight onto Today’s page.</p>
                <Field label="Task">
                  <Input value={first.task} placeholder="Draft the client proposal" onChange={(e) => setFirst({ ...first, task: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Starts">
                    <Input type="time" value={first.start} onChange={(e) => setFirst({ ...first, start: e.target.value })} />
                  </Field>
                  <Field label="Ends">
                    <Input type="time" value={first.end} onChange={(e) => setFirst({ ...first, end: e.target.value })} />
                  </Field>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <p>On Today, tap <strong>Start · ring the bell</strong> when your block begins. It rings and writes down the time. Tap <strong>Done — ring the bell</strong> when you stop.</p>
                <p>Try the sounds now so you know them:</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void playStartBell()}>
                    <Bell className="size-4" /> Start bell
                  </Button>
                  <Button variant="outline" onClick={() => void playDoneBell()}>
                    <BellRing className="size-4" /> End bell
                  </Button>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <p>When your work day is over, tap <strong>Close day</strong> at the bottom right. Write one line about how it went, and the app marks the day done and gets tomorrow ready.</p>
                <p>That’s it. Tapping the button below starts Day 1 of your 7-day starter.</p>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Button variant="ghost" onClick={close}>
              Skip
            </Button>
            <div className="ml-auto flex gap-2">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              ) : null}
              <Button onClick={next}>{last ? "Start Day 1" : "Next"}</Button>
            </div>
          </div>
        </div>
      </div>
    </SheetPortal>
  );
}
