import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/sheet-portal";
import { Field, Input } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";
import { playDoneBell, playStartBell } from "@/lib/chime";
import { todayKey, weekKey } from "@/lib/utils";
import { blockDefaults, endForStart, shortClock } from "@/lib/work-hours";

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

type BlockDraft = { task: string; start: string; end: string };

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
  // Today's blocks. Times follow the work hours from step 1 until the user edits them.
  const [first, setFirstState] = useState<BlockDraft>(() => {
    const d = useFocusStore.getState().dailies[todayKey()]?.slots[0];
    const def = blockDefaults(0, household.hours);
    return { task: d?.task ?? "", start: d?.start || def.start, end: d?.end || def.end };
  });
  const [second, setSecondState] = useState<BlockDraft>(() => {
    const d = useFocusStore.getState().dailies[todayKey()]?.slots[1];
    return { task: d?.task ?? "", start: d?.start ?? "", end: d?.end ?? "" };
  });
  // Times already saved on Today (e.g. replaying the tour) count as chosen.
  const firstTimesTouched = useRef(
    Boolean(useFocusStore.getState().dailies[todayKey()]?.slots[0]?.task),
  );
  const secondTimesTouched = useRef(
    Boolean(useFocusStore.getState().dailies[todayKey()]?.slots[1]?.start),
  );
  const workHours = `${hours[0]}–${hours[1]}`;
  const weekDefault = blockDefaults(0, workHours);
  const weekExample = `${shortClock(weekDefault.start)}–${shortClock(weekDefault.end)}`;

  function setFirst(next: BlockDraft, timesEdited = false) {
    if (timesEdited) firstTimesTouched.current = true;
    setFirstState(next);
    if (!secondTimesTouched.current) {
      const def = blockDefaults(1, workHours, next.end);
      setSecondState((cur) => ({ ...cur, start: def.start, end: def.end }));
    }
  }

  function setSecond(next: BlockDraft, timesEdited = false) {
    if (timesEdited) secondTimesTouched.current = true;
    setSecondState(next);
  }

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
    if (step === 0) {
      setHousehold({ hours: workHours });
      // Re-seat today's blocks inside the new work hours unless already chosen.
      const def0 = blockDefaults(0, workHours);
      const nextFirst = firstTimesTouched.current
        ? first
        : { ...first, start: def0.start, end: def0.end };
      setFirstState(nextFirst);
      if (!secondTimesTouched.current) {
        const def1 = blockDefaults(1, workHours, nextFirst.end);
        setSecondState((cur) => ({ ...cur, start: def1.start, end: def1.end }));
      }
    }
    if (step === 1) {
      const cur = useFocusStore.getState().weeks[wk]?.blocks ?? ["", "", "", ""];
      patchWeek(wk, { blocks: [blocks[0], blocks[1], cur[2] ?? "", cur[3] ?? ""] });
      // Carry the named blocks onto Today if those tasks are still empty.
      if (!first.task.trim() && blocks[0].trim()) {
        setFirstState((f) => ({ ...f, task: blocks[0].trim() }));
      }
      if (!second.task.trim() && blocks[1].trim()) {
        setSecondState((b) => ({ ...b, task: blocks[1].trim() }));
      }
    }
    if (step === 2) {
      const date = todayKey();
      patchSlot(date, 0, { task: first.task, start: first.start, end: first.end });
      if (second.task.trim()) {
        patchSlot(date, 1, { task: second.task, start: second.start, end: second.end });
        const count = useFocusStore.getState().dailies[date]?.slotCount ?? 1;
        if (count < 2) useFocusStore.getState().patchDaily(date, { slotCount: 2 });
      }
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
                  <Input value={blocks[0]} placeholder={`Mon ${weekExample} · hardest task`} onChange={(e) => setBlocks([e.target.value, blocks[1]])} />
                </Field>
                <Field label="Block 2">
                  <Input value={blocks[1]} placeholder={`Wed ${weekExample} · next deep block`} onChange={(e) => setBlocks([blocks[0], e.target.value])} />
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
                    <Input
                      type="time"
                      value={first.start}
                      onChange={(e) => {
                        const start = e.target.value;
                        const end = firstTimesTouched.current ? first.end : endForStart(start, workHours) || first.end;
                        setFirst({ ...first, start, end }, true);
                      }}
                    />
                  </Field>
                  <Field label="Ends">
                    <Input type="time" value={first.end} onChange={(e) => setFirst({ ...first, end: e.target.value }, true)} />
                  </Field>
                </div>
                {second.task.trim() ? (
                  <>
                    <Field label="Block 2 task">
                      <Input value={second.task} onChange={(e) => setSecond({ ...second, task: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Block 2 starts">
                        <Input type="time" value={second.start} onChange={(e) => setSecond({ ...second, start: e.target.value }, true)} />
                      </Field>
                      <Field label="Block 2 ends">
                        <Input type="time" value={second.end} onChange={(e) => setSecond({ ...second, end: e.target.value }, true)} />
                      </Field>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <p>On Today, tap <strong>Start · ring the bell</strong> when your block begins. It rings and writes down the time. The button then changes to <strong>End · ring the bell</strong> — tap it when you stop.</p>
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
                <p>When your work day is over, write one line in the <strong>Shutdown note</strong> on Today, then tap <strong>Close day</strong>. It’s the moon icon at the far right of the toolbar along the bottom of the screen (next to Tools). The same <strong>Close day</strong> button also sits under the Shutdown note, beside Send to partner and Print this day.</p>
                <p>Close day marks the day done, offers to save a PDF, and opens tomorrow’s page.</p>
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
