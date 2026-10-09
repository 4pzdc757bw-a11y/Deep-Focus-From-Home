import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/sheet-portal";
import { Field, Input } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";
import { playDoneBell, playStartBell } from "@/lib/chime";
import { weekKey } from "@/lib/utils";
import {
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  blockDefaults,
  endForStart,
  endsNextDay,
  normalizeWorkDays,
  parseWorkHours,
  snapClock,
  spanMinutes,
  toClock,
  workdayKey,
  workHoursText,
} from "@/lib/work-hours";
import { formatWeekBlock, parseWeekBlock, type WeekBlockDraft } from "@/lib/week-blocks";
import { DayButton, WeekSlotPicker } from "@/components/week-slot-picker";

const STEPS = [
  "Your work hours",
  "This week’s focus blocks",
  "The start and end bell",
  "Close out the day",
] as const;

function splitHours(hours: string): [string, string] {
  const wh = parseWorkHours(hours);
  if (!wh) return ["09:00", "17:00"];
  // Overnight stops come back as next-morning clock times (07:00).
  return [toClock(wh.start), wh.stop != null ? toClock(wh.stop) : "17:00"];
}

/** Default days for the two weekly blocks: first work day, then two work days later. */
function defaultWeekDays(workDays: number[]): [number, number] {
  const ordered = WEEKDAY_ORDER.filter((d) => workDays.includes(d));
  const a = ordered[0] ?? 1;
  const b = ordered[Math.min(2, ordered.length - 1)] ?? 3;
  return [a, b === a && ordered.length > 1 ? (ordered[1] ?? 3) : b];
}

function defaultWeekSlot(day: number, workHours: string): WeekBlockDraft {
  const def = blockDefaults(0, workHours);
  return { day, start: snapClock(def.start), end: snapClock(def.end), task: "" };
}

/**
 * First-open walkthrough: four short steps, one at a time.
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
  const [workDays, setWorkDays] = useState<number[]>(() =>
    normalizeWorkDays(household.workDays),
  );
  // This week's two focus blocks: day buttons + time pickers, saved as text lines.
  const [blocks, setBlocks] = useState<[WeekBlockDraft, WeekBlockDraft]>(() => {
    const w = useFocusStore.getState().weeks[wk];
    const days = defaultWeekDays(normalizeWorkDays(household.workDays));
    const hrs = splitHours(household.hours);
    const wh = `${hrs[0]}–${hrs[1]}`;
    return [0, 1].map((i) => {
      const saved = parseWeekBlock(w?.blocks[i]);
      const def = defaultWeekSlot(days[i]!, wh);
      if (!saved) {
        // Older free text without a day: keep it as the task.
        const text = (w?.blocks[i] ?? "").trim();
        return { ...def, task: text };
      }
      return {
        day: saved.day,
        start: saved.start ? snapClock(saved.start) : def.start,
        end: saved.end ? snapClock(saved.end) : def.end,
        task: saved.task,
      };
    }) as [WeekBlockDraft, WeekBlockDraft];
  });
  // Saved lines count as chosen; untouched picks follow the work hours/days.
  const weekTouched = useRef(
    [0, 1].map((i) => Boolean(parseWeekBlock(useFocusStore.getState().weeks[wk]?.blocks[i]))),
  );
  // Saved with AM/PM ("11:00 PM–7:00 AM"); parseWorkHours reads both forms.
  const workHours = workHoursText(hours[0], hours[1]);

  function setWeekSlot(i: 0 | 1, next: WeekBlockDraft, timesEdited?: "start" | "end") {
    weekTouched.current[i] = true;
    let value = next;
    if (timesEdited === "start") {
      const end = endForStart(next.start, workHours);
      if (end) value = { ...next, end: snapClock(end) };
    }
    // Ends before (or at) the start, or a wrap of more than 12 h: reset to 90 min.
    // A night-shift block like 11:00 PM → 12:30 AM (next day) is fine.
    const span = value.end && value.start ? spanMinutes(value.start, value.end) : null;
    if (value.end && value.start && (span == null || span > 12 * 60)) {
      const end = endForStart(value.start, workHours);
      value = { ...value, end: end ? snapClock(end) : value.end };
    }
    setBlocks((cur) => (i === 0 ? [value, cur[1]] : [cur[0], value]));
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
      setHousehold({ hours: workHours, workDays });
      // Untouched weekly picks follow the new work hours and days.
      const days = defaultWeekDays(workDays);
      setBlocks((cur) =>
        cur.map((b, i) =>
          weekTouched.current[i] ? b : { ...defaultWeekSlot(days[i]!, workHours), task: b.task },
        ) as [WeekBlockDraft, WeekBlockDraft],
      );
    }
    if (step === 1) {
      const cur = useFocusStore.getState().weeks[wk]?.blocks ?? [];
      patchWeek(wk, {
        blocks: [
          formatWeekBlock({ ...blocks[0], task: blocks[0].task.trim() }),
          formatWeekBlock({ ...blocks[1], task: blocks[1].task.trim() }),
          ...cur.slice(2),
        ],
      });
      // Block 1 goes straight onto Today's page with the same task, start and end
      // (no second "first focus block" step). Block 2's task becomes Today's Block 2.
      const date = workdayKey(new Date(), workHours);
      const st = useFocusStore.getState();
      const today = st.dailies[date];
      const running = st.session.running && st.session.date === date;
      const slot0 = today?.slots[0];
      const t0 = blocks[0].task.trim();
      const t1 = blocks[1].task.trim();
      if (!running && (!slot0?.task?.trim() || slot0.task.trim() === t0)) {
        patchSlot(date, 0, { task: t0 || slot0?.task || "", start: blocks[0].start, end: blocks[0].end });
      }
      const slot1 = today?.slots[1];
      if (!running && t1 && !slot1?.task?.trim()) {
        const def1 = blockDefaults(1, workHours, blocks[0].end);
        patchSlot(date, 1, { task: t1, start: def1.start, end: def1.end });
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
                {endsNextDay(hours[0], hours[1]) ? (
                  <p className="-mt-2 text-sm text-muted">
                    Night shift: you stop the next morning. Each shift counts as the day it starts.
                  </p>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Work days</p>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Work days">
                    {WEEKDAY_ORDER.map((d) => (
                      <DayButton
                        key={d}
                        label={WEEKDAY_SHORT[d]}
                        pressed={workDays.includes(d)}
                        onClick={() =>
                          setWorkDays((cur) =>
                            cur.includes(d)
                              ? cur.length > 1
                                ? cur.filter((x) => x !== d)
                                : cur
                              : [...cur, d].sort((a, b) => a - b),
                          )
                        }
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted">Close day skips to your next work day.</p>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <p>Pick two times this week for your hardest work. Just two to start. You can add more on the This week page.</p>
                <p className="text-sm text-muted">Block 1 also goes on Today’s page, with the same task and times.</p>
                <WeekSlotPicker
                  label="Block 1"
                  value={blocks[0]}
                  hours={workHours}
                  taskPlaceholder="Hardest task"
                  onChange={(next, edited) => setWeekSlot(0, next, edited)}
                />
                <WeekSlotPicker
                  label="Block 2"
                  value={blocks[1]}
                  hours={workHours}
                  taskPlaceholder="Next deep block"
                  onChange={(next, edited) => setWeekSlot(1, next, edited)}
                />
              </>
            ) : null}

            {step === 2 ? (
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

            {step === 3 ? (
              <>
                <p>When your work day is over, scroll down Today to the <strong>Shutdown note</strong> and write one line. Tick the two shutdown steps under <strong>End of day</strong>, then tap the <strong>Close day</strong> button just below them, beside Send to partner and Print this day.</p>
                <p>Close day marks the day done, offers to save a PDF (unless you just printed it), and opens your next work day’s page.</p>
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
