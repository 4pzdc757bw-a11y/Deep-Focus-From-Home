import { Bell, BellRing, Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
} from "@/lib/chime";
import { catchUpBlocks, startPlan } from "@/lib/block-plan";
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

  // Opening today's page after a planned start has passed (e.g. 3:52 AM on an
  // 11 PM shift): move not-yet-rung blocks to the next quarter hour so the
  // times, countdown and bell match now. Edited or rung blocks stay put.
  useEffect(() => {
    if (!hydrated || osDate !== workday) return;
    const st = useFocusStore.getState();
    if (st.session.running && st.session.date === osDate) return;
    // Blocks rung before the `started` flag existed: today's last session covers them.
    const rungUpTo =
      entry.checks.block && st.session.date === osDate ? st.session.slotIndex : -1;
    const slots = entry.slots.map((sl, i) => (i <= rungUpTo ? { ...sl, started: true } : sl));
    const moves = catchUpBlocks(slots, entry.slotCount ?? 1, osDate, workHours, new Date());
    for (const mv of moves) patchSlot(mv.index, { start: mv.start, end: mv.end });
    // Only on open / day change; edits afterwards are the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, osDate, workday]);

  useEffect(() => {
    if (!activeHere || left > 0) return;
    void completeSession();
  }, [activeHere, left]);

  // After Stop (manual or timer): offer optional energy log — never blocks Stop.
  useEffect(() => {
    const runningHere = session.running && session.date === osDate;
    if (
      wasRunningHere.current &&
      !runningHere &&
      session.phase === "done" &&
      session.date === osDate
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
    // Stamp actual start; end follows the planned length (Done stamps the real end).
    const plan = startPlan(slot);
    patchSlot(index, { start: plan.start, end: plan.end, started: true });
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1400);
    if (shouldExplainNotify()) setNotifyAsk(true);
    await beginSession({
      date: osDate,
      slotIndex: index,
      endsAt: plan.endsAt,
    });
  }

  async function finishNow() {
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1800);
    // completeSession stamps Ends with wall-clock time.
    await completeSession();
  }

  function addBlock() {
    if (visible >= 3) return;
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
          ? endForStart(slot.start, workHours) || defaults.end
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
              <Input
                value={slot.outcome}
                placeholder="What done looks like"
                aria-label={`${SLOT_LABELS[i]} outcome`}
                onChange={(e) => patchSlot(i, { outcome: e.target.value })}
              />
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
                  <Button type="button" size="sm" variant="ghost" onClick={() => setNotifyAsk(false)}>
                    Not now
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
                Before you ring the bell
              </p>
              {BLOCK_PREP_CHECKS.map((c) => {
                const prep = slot.prep ?? emptyPrep();
                return (
                  <CheckRow
                    key={c.id}
                    label={c.label}
                    checked={prep[c.id]}
                    onCheckedChange={(v) => patchSlot(i, { prep: { ...prep, [c.id]: v } })}
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
                  onClick={() => void startSlot(i)}
                >
                  <Bell
                    className={cn("size-4", ringing && session.slotIndex === i && "animate-pulse")}
                  />
                  Start · ring the bell
                </Button>
              )}
            </div>
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
        <Field label="Shutdown note">
          <Textarea
            value={entry.note}
            onChange={(e) => patch({ note: e.target.value })}
            placeholder="What finished. What waits until tomorrow."
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
            <CheckRow
              key={step.id}
              label={step.label}
              checked={entry.shutdownSteps[step.id]}
              onCheckedChange={(v) => {
                const shutdownSteps = { ...entry.shutdownSteps, [step.id]: v };
                const all = SHUTDOWN_STEPS.every((x) => shutdownSteps[x.id]);
                patch({ shutdownSteps, checks: { ...entry.checks, shutdown: all } });
              }}
            />
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
          <CloseDayButton variant="inline" />
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
