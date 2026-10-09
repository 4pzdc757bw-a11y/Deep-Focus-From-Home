import { Bell, BellRing, Check, Plus } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Card } from "@/components/app-shell";
import { CloseDayButton } from "@/components/close-day-button";
import { EnergyCheckInSheet, type EnergyCheckInContext } from "@/components/energy-check-in-sheet";
import { slotLabelFromBlock } from "@/components/energy-scale";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/input";
import { BLOCK_PREP_CHECKS, SHUTDOWN_STEPS } from "@/lib/content";
import {
  durationLabel,
  durationMinutes,
  remainingLabel,
  stampClockNow,
  unlockAudio,
} from "@/lib/chime";
import { prepBlockedMessage, prepHeading, prepReady } from "@/lib/block-prep";
import { claimEnergyPrompt } from "@/lib/energy-prompt";
import { catchUpBlocks, nextBlockTimes, startPlan, withLength } from "@/lib/block-plan";
import { installPrintTextareaFit, printDaily, setActivePrintDate } from "@/lib/print";
import { blockDefaults, endForStart, endsNextDay } from "@/lib/work-hours";
import { useWorkdayKey } from "@/lib/workday";
import {
  beginSession,
  completeSession,
  requestNotify,
  shouldExplainNotify,
} from "@/lib/session-runtime";
import { partnerMessage } from "@/lib/backup";
import { shareOrCopy } from "@/lib/share";
import { emptyPrep, emptySlot, useDaily, useFocusStore } from "@/lib/store";
import { cn, prettyDate } from "@/lib/utils";

const SLOT_LABELS = ["Block 1", "Block 2", "Block 3"] as const;
const PREP_IDS = BLOCK_PREP_CHECKS.map((c) => c.id);

function TimeField({
  label,
  value,
  fallback,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <Field label={label}>
      {value ? (
        <Input
          type="time"
          value={value}
          readOnly={readOnly}
          className={readOnly ? undefined : "cursor-pointer"}
          onClick={(e) => {
            if (readOnly) return;
            try {
              e.currentTarget.showPicker?.();
            } catch {
              /* older browsers: native focus/typing still works */
            }
          }}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <button
          type="button"
          className="h-11 w-full rounded-md border border-dashed border-yellow bg-paper px-3 text-left text-muted"
          onClick={() => onChange(fallback)}
          disabled={readOnly}
        >
          Set time
        </button>
      )}
    </Field>
  );
}

function StatusLine({
  done,
  label,
  pending,
}: {
  done: boolean;
  label: string;
  pending: string;
}) {
  return (
    <p
      className={cn(
        "daily-status flex items-center gap-2 px-3 py-1 text-sm print:px-0",
        done ? "font-semibold text-olive" : "text-muted",
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-sm border",
          done ? "border-olive bg-olive text-cream" : "border-gold",
        )}
        aria-hidden="true"
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span>
        {label}
        {done ? " — done" : <span className="print:hidden"> — {pending}</span>}
      </span>
    </p>
  );
}

export function DailyOs({ date }: { date?: string }) {
  const hydrated = useFocusStore((s) => s.hydrated);
  const workday = useWorkdayKey();
  const osDate = date ?? workday;
  const { entry, patch, patchSlot } = useDaily(osDate);
  const session = useFocusStore((s) => s.session);
  const workHours = useFocusStore((s) => s.household.hours);
  const [now, setNow] = useState(() => Date.now());
  const [ringing, setRinging] = useState(false);
  const [shareState, setShareState] = useState("");
  const [energyPrompt, setEnergyPrompt] = useState<EnergyCheckInContext | null>(
    null,
  );
  const wasRunningHere = useRef(false);
  // One-time "allow notifications" explainer, shown after Start while the
  // browser has not been asked yet. The browser prompt only follows OK.
  const [notifyAsk, setNotifyAsk] = useState(false);
  // Block whose Start was tapped before all prep boxes were ticked.
  const [prepNudge, setPrepNudge] = useState<number | null>(null);

  // Cmd+P / Ctrl+P too: fit notes to their content while printing.
  useEffect(() => {
    installPrintTextareaFit();
  }, []);

  // Cmd+P on this page counts as saving this day (Close day won't ask again).
  useEffect(() => {
    setActivePrintDate(osDate);
    return () => setActivePrintDate(null);
  }, [osDate]);

  const visible = Math.min(3, Math.max(1, entry.slotCount ?? 1)) as 1 | 2 | 3;
  const activeHere = session.running && session.date === osDate;

  useEffect(() => {
    if (!activeHere || !session.endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [activeHere, session.endsAt]);

  const left = activeHere && session.endsAt ? session.endsAt - now : 0;
  const entryRef = useRef(entry);
  entryRef.current = entry;

  // Opening today's page after a planned start has passed (e.g. 3:52 AM on an
  // 11 PM shift): move not-yet-rung blocks to the next quarter hour so the
  // times, countdown and bell match now. Edited or rung blocks stay put.
  // Also right after a block ends: later blocks follow its real end (+15 min).
  useEffect(() => {
    if (!hydrated || osDate !== workday) return;
    const st = useFocusStore.getState();
    if (st.session.running && st.session.date === osDate) return;
    const fresh = st.dailies[osDate];
    const entry = fresh ? { ...entryRef.current, slots: fresh.slots, slotCount: fresh.slotCount } : entryRef.current;
    // Blocks rung before the `started` flag existed: today's last session covers them.
    const rungUpTo =
      entry.checks.block && st.session.date === osDate ? st.session.slotIndex : -1;
    const slots = entry.slots.map((sl, i) => (i <= rungUpTo ? { ...sl, started: true } : sl));
    const moves = catchUpBlocks(slots, entry.slotCount ?? 1, osDate, workHours, new Date());
    for (const mv of moves) patchSlot(mv.index, { start: mv.start, end: mv.end, auto: true });
    // Only on open / day change; edits afterwards are the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, osDate, workday, session.running]);

  useEffect(() => {
    if (!activeHere || left > 0) return;
    void completeSession();
  }, [activeHere, left]);

  // After Stop (manual or timer): offer optional energy log — never blocks Stop.
  // Only after the first block ending before noon and the first ending at/after noon.
  useEffect(() => {
    const runningHere = session.running && session.date === osDate;
    if (
      wasRunningHere.current &&
      !runningHere &&
      session.phase === "done" &&
      session.date === osDate &&
      // Owner rule: at most twice a workday — first morning block, first afternoon block.
      claimEnergyPrompt(osDate, new Date())
    ) {
      const idx = session.slotIndex;
      const daily = useFocusStore.getState().dailies[osDate];
      const slot = daily?.slots[idx] ?? emptySlot();
      setEnergyPrompt({
        date: osDate,
        blockIndex: idx,
        slotLabel: slotLabelFromBlock(slot, idx),
      });
    }
    wasRunningHere.current = runningHere;
  }, [session.running, session.phase, session.date, session.slotIndex, osDate]);

  async function startSlot(index: number) {
    const slot = entry.slots[index];
    // Owner rule: no bell until every "Before you ring the bell" box is ticked.
    if (!prepReady(slot?.prep, PREP_IDS)) {
      setPrepNudge(index);
      return;
    }
    setPrepNudge(null);
    // Stamp actual start; end follows the planned length (Done stamps the real end).
    const plan = startPlan(slot);
    // Unlock audio inside this tap before any notify UI — first Start used to
    // lose the bell when the allow-notifications box appeared on the same click.
    unlockAudio();
    patchSlot(index, { start: plan.start, end: plan.end, started: true, auto: false });
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1400);
    const starting = beginSession({
      date: osDate,
      slotIndex: index,
      endsAt: plan.endsAt,
    });
    // Explainer only after the start bell has been kicked off in this gesture.
    if (shouldExplainNotify()) setNotifyAsk(true);
    await starting;
  }

  async function finishNow() {
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1800);
    // completeSession stamps Ends with wall-clock time.
    await completeSession();
  }

  function addBlock() {
    if (visible >= 3) return;
    const prev = entry.slots[visible - 1];
    // Always pre-filled (no "Set time"): 15 min after the previous block's end,
    // or now if later, rounded up to the quarter hour, 90 min long. "Now" counts
    // when the previous block actually ran or this is today's page.
    const useNow = Boolean(prev?.started) || osDate === workday;
    const times = nextBlockTimes(prev, visible, workHours, useNow ? new Date() : null);
    patchSlot(visible, { start: times.start, end: times.end, auto: true });
    patch({ slotCount: (visible + 1) as 2 | 3 });
  }

  function removeLast() {
    if (visible <= 1) return;
    const index = visible - 1;
    patchSlot(index, emptySlot());
    patch({ slotCount: (visible - 1) as 1 | 2 });
  }

  return (
    <div className="daily-os flex flex-col gap-5">
      <div className="daily-print-header hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
          Deep Focus from Home · Daily OS
        </p>
        <h1 className="font-display text-2xl text-olive">{hydrated ? prettyDate(osDate) : "Today"}</h1>
      </div>

      {entry.slots.slice(0, visible).map((slot, i) => {
        const active = activeHere && session.slotIndex === i;
        const doneHere =
          session.phase === "done" && session.date === osDate && session.slotIndex === i;
        const dur =
          slot.start && slot.end ? durationLabel(slot.start, slot.end) : "";
        // "Set time" fills from the work day: block 1 at day start, later
        // blocks 30 min after the previous block ends.
        const defaults = blockDefaults(i, workHours, entry.slots[i - 1]?.end);
        const endFallback = slot.start
          ? withLength({ start: slot.start, end: endForStart(slot.start, workHours) || defaults.end }).end
          : defaults.end;
        return (
          <Card key={i} className="daily-block flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                {SLOT_LABELS[i]}
              </p>
              {active ? (
                <span className="tabular-nums text-sm font-semibold text-olive">
                  {remainingLabel(left)} left
                </span>
              ) : doneHere || dur ? (
                <span className="text-sm font-semibold text-olive">
                  {doneHere ? "Block complete" : null}
                  {dur ? `${doneHere ? " · " : ""}${dur}` : null}
                </span>
              ) : i > 0 && i === visible - 1 ? (
                <button
                  type="button"
                  className="no-print text-sm font-semibold text-gold"
                  onClick={removeLast}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="daily-times grid grid-cols-2 gap-3">
              <TimeField
                label="Starts"
                value={slot.start}
                fallback={defaults.start}
                onChange={(start) => patchSlot(i, { start, edited: true })}
                readOnly={active}
              />
              <TimeField
                label={slot.start && slot.end && endsNextDay(slot.start, slot.end) ? "Ends (next day)" : "Ends"}
                value={slot.end}
                fallback={endFallback}
                onChange={(end) => patchSlot(i, { end, edited: true })}
                readOnly={active}
              />
            </div>
            {i === 0 && !active && !doneHere && !slot.started ? (
              <p className="daily-time-hint no-print -mt-1 text-sm text-muted">
                Times not right? Tap a time to change it, or just press Start and the
                bell uses the real time.
              </p>
            ) : null}
            {dur && (doneHere || (slot.start && slot.end && !active)) ? (
              <p className="daily-duration text-sm text-muted print:text-ink">
                Duration: <span className="font-semibold text-olive">{dur}</span>
              </p>
            ) : null}
            <Field label="Task in this slot">
              <Input
                value={slot.task}
                placeholder="What you will sit down and do"
                aria-label={`${SLOT_LABELS[i]} task`}
                onChange={(e) => patchSlot(i, { task: e.target.value })}
              />
            </Field>
            <Field label="Outcome">
              <div className="daily-outcome-row flex items-center gap-2">
                <Input
                  value={slot.outcome}
                  placeholder="What done looks like"
                  aria-label={`${SLOT_LABELS[i]} outcome`}
                  className="min-w-0 flex-1"
                  onChange={(e) => patchSlot(i, { outcome: e.target.value })}
                />
                <DoneToggle
                  checked={Boolean(slot.outcomeDone)}
                  label={`${SLOT_LABELS[i]} outcome done`}
                  onChange={(v) => patchSlot(i, { outcomeDone: v })}
                />
              </div>
            </Field>
            {active && notifyAsk ? (
              <div
                role="dialog"
                aria-label="Allow notifications"
                className="no-print flex flex-col gap-2 rounded-md border border-gold bg-paper p-3 sm:flex-row sm:items-center"
              >
                <p className="text-sm text-ink sm:flex-1">
                  Allow notifications so the bell can alert you when a block ends. You only
                  need to do this once.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setNotifyAsk(false);
                      void requestNotify();
                    }}
                  >
                    OK
                  </Button>
                </div>
              </div>
            ) : null}
            {active ? (
              <p className="no-print text-sm text-muted">
                The screen stays awake for this block. If you lock the phone, the
                bell rings when you open the app again.
              </p>
            ) : null}
            <div className="daily-prep flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                {prepHeading(PREP_IDS.length)}
              </p>
              {BLOCK_PREP_CHECKS.map((c) => {
                const prep = slot.prep ?? emptyPrep();
                return (
                  <CheckRow
                    key={c.id}
                    label={c.label}
                    checked={prep[c.id]}
                    onCheckedChange={(v) => {
                      const nextPrep = { ...prep, [c.id]: v };
                      patchSlot(i, { prep: nextPrep });
                      if (prepNudge === i && prepReady(nextPrep, PREP_IDS)) setPrepNudge(null);
                    }}
                  />
                );
              })}
            </div>
            <div className="no-print flex flex-wrap gap-2">
              {active ? (
                <Button type="button" onClick={() => void finishNow()}>
                  <BellRing className={cn("size-4", ringing && "animate-pulse")} />
                  End · ring the bell
                </Button>
              ) : (
                <Button
                  type="button"
                  variant={i === 0 ? "default" : "outline"}
                  aria-describedby={prepNudge === i ? `daily-prep-nudge-${i}` : undefined}
                  onClick={() => void startSlot(i)}
                >
                  <Bell
                    className={cn("size-4", ringing && session.slotIndex === i && "animate-pulse")}
                  />
                  Start · ring the bell
                </Button>
              )}
            </div>
            {!active && prepNudge === i && !prepReady(slot.prep, PREP_IDS) ? (
              <p
                id={`daily-prep-nudge-${i}`}
                role="alert"
                className="no-print -mt-1 rounded-md border border-gold bg-paper px-3 py-2 text-sm font-semibold text-ink"
              >
                {prepBlockedMessage(PREP_IDS.length)}
              </p>
            ) : null}
          </Card>
        );
      })}

      {visible < 3 ? (
        <Button type="button" variant="outline" className="no-print" onClick={addBlock}>
          <Plus className="size-4" />
          Add another block
        </Button>
      ) : null}

      <Card className="daily-notes flex flex-col gap-3">
        <Field label="Note to accountability partner">
          <Textarea
            value={entry.partnerNote}
            onChange={(e) => patch({ partnerNote: e.target.value })}
            placeholder="Today I will finish…"
          />
        </Field>
        <div className="daily-endday flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            End of day
          </p>
          <StatusLine
            done={entry.checks.block}
            label="Deep-work block started"
            pending="ticks itself when a start bell rings"
          />
          <p className="daily-subhead mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            Shutdown · 5 minutes
          </p>
          {SHUTDOWN_STEPS.map((step) => (
            <Fragment key={step.id}>
              <CheckRow
                label={step.label}
                checked={entry.shutdownSteps[step.id]}
                onCheckedChange={(v) => {
                  const shutdownSteps = { ...entry.shutdownSteps, [step.id]: v };
                  const all = SHUTDOWN_STEPS.every((x) => shutdownSteps[x.id]);
                  patch({ shutdownSteps, checks: { ...entry.checks, shutdown: all } });
                }}
              />
              {step.id === "outcomes" ? (
                <p className="daily-step-hint no-print -mt-1 pl-12 text-sm text-muted">
                  Check Done on each outcome you finished.
                </p>
              ) : null}
              {step.id === "loops" ? (
                <>
                  <div className="daily-endday-note">
                    <Field label="Shutdown note">
                      <Textarea
                        value={entry.note}
                        onChange={(e) => patch({ note: e.target.value })}
                        placeholder="What finished. What waits until tomorrow."
                      />
                    </Field>
                  </div>
                  <div className="no-print flex flex-wrap gap-2 py-1">
                    <CloseDayButton variant="inline" />
                  </div>
                </>
              ) : null}
            </Fragment>
          ))}
          <StatusLine
            done={entry.checks.shutdown}
            label="Shutdown sequence done"
            pending="ticks itself when all steps are ticked, or when you close the day"
          />
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void shareOrCopy(
                partnerMessage({
                  date: prettyDate(osDate),
                  partnerNote: entry.partnerNote,
                  slots: entry.slots.slice(0, visible),
                }),
              ).then((result) => {
                setShareState(
                  result === "shared"
                    ? "Sent"
                    : result === "copied"
                      ? "Copied — paste it to your partner"
                      : "Could not share from this browser",
                );
              });
            }}
          >
            Send to partner
          </Button>
          <Button type="button" variant="outline" onClick={() => printDaily(osDate)}>
            Print this day
          </Button>
        </div>
        {shareState ? <p className="no-print text-sm text-olive">{shareState}</p> : null}
      </Card>

      {energyPrompt ? (
        <EnergyCheckInSheet
          context={energyPrompt}
          onDismiss={() => setEnergyPrompt(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * "Done" tick beside a block's Outcome. A button (not a nested label) so a tap
 * on it never focuses the Outcome input; prints as a small box + "Done".
 */
function DoneToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className="daily-done flex min-h-12 shrink-0 items-center gap-2 rounded-md bg-cream px-3 text-base text-ink print:min-h-0 print:bg-transparent print:px-0"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-6 items-center justify-center rounded-sm border border-gold bg-paper text-olive",
          checked && "bg-olive text-cream",
        )}
      >
        {checked ? <Check className="size-4" strokeWidth={3} /> : null}
      </span>
      Done
    </button>
  );
}
