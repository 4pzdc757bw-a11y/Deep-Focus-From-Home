import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarRange,
  Check,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
import {
  MAX_DAY_BLOCKS,
  MIN_DAY_BLOCKS,
  catchUpBlocks,
  clampBlockCount,
  nextBlockTimes,
  startPlan,
  withLength,
} from "@/lib/block-plan";
import { installPrintTextareaFit, printDaily, setActivePrintDate } from "@/lib/print";
import { blockDefaults, clock12, endForStart, endsNextDay } from "@/lib/work-hours";
import { useWorkdayKey } from "@/lib/workday";
import { BLOCK_LENGTHS, blockLength, endAfter } from "@/lib/week-blocks";
import {
  beginSession,
  completeSession,
  requestNotify,
  shouldExplainNotify,
} from "@/lib/session-runtime";
import { partnerMessage } from "@/lib/backup";
import { shareOrCopy } from "@/lib/share";
import {
  emptySlot,
  emptyPrep,
  migrateDaily,
  useDaily,
  useFocusStore,
  type MoveResult,
} from "@/lib/store";
import { cn, prettyDate } from "@/lib/utils";

const blockLabel = (i: number) => `Block ${i + 1}`;

/** 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h". */
function lengthLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const lengthSelectClass =
  "h-11 w-full rounded-md border border-yellow bg-paper px-2 text-base text-ink outline-none focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:opacity-70";

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
        <>
          {/* Paper copy: plain "10:45 AM" (a time input prints with a clock icon and gets cut off). */}
          <span className="daily-time-text hidden">{clock12(value)}</span>
          <Input
            type="time"
            value={value}
            readOnly={readOnly}
            className={cn("print:hidden", !readOnly && "cursor-pointer")}
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
        </>
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

/**
 * A notes box. On paper the text prints as plain wrapped text (the textarea
 * is hidden), so it grows to fit whatever column width print gives it.
 */
function NoteField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Textarea
        className="print:hidden"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <span className="daily-note-text hidden">{value}</span>
    </Field>
  );
}

/**
 * Top of the Daily OS until hidden or the week's blocks are set: a nudge to
 * make the default blocks match how their day really runs.
 */
function BlockSetupPrompt() {
  const hydrated = useFocusStore((s) => s.hydrated);
  const done = useFocusStore((s) => s.blockSetupDone);
  const markDone = useFocusStore((s) => s.markBlockSetupDone);
  if (!hydrated || done) return null;
  return (
    <section
      aria-label="Set up your blocks"
      className="daily-setup-prompt no-print relative flex flex-col gap-3 rounded-lg border-2 border-olive/40 bg-paper p-4 pr-11 sm:flex-row sm:items-center"
    >
      <p className="text-pretty text-ink sm:flex-1">
        <span className="font-semibold text-olive">
          Make these blocks match your real day.
        </span>{" "}
        Set up each day on the Week page the way it really runs: block times,
        lengths, meetings. Every day can be different.
      </p>
      <Link
        to="/week"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-olive px-4 text-sm font-semibold text-cream hover:bg-olive/90"
      >
        <CalendarRange className="size-4" />
        Set up my week
      </Link>
      <button
        type="button"
        onClick={markDone}
        aria-label="Hide this tip"
        className="absolute right-2 top-2 grid size-9 place-items-center rounded-md text-muted hover:bg-cream hover:text-olive"
      >
        <X className="size-4" />
      </button>
    </section>
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
  const [moved, setMoved] = useState<MoveResult | null>(null);
  const movedRef = useRef<HTMLParagraphElement>(null);
  // The note sits under the blocks; bring it into view so the move is seen.
  useEffect(() => {
    if (moved)
      movedRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "nearest",
      });
  }, [moved]);
  const removeSlot = useFocusStore((s) => s.removeSlot);
  const moveSlotToNextDay = useFocusStore((s) => s.moveSlotToNextDay);
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

  const visible = clampBlockCount(entry.slotCount);
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
    const entry = fresh
      ? migrateDaily(fresh as unknown as Record<string, unknown>, st.household?.hours)
      : entryRef.current;
    // Blocks rung before the `started` flag existed: today's last session covers them.
    const rungUpTo =
      entry.checks.block && st.session.date === osDate ? st.session.slotIndex : -1;
    const slots = entry.slots.map((sl, i) => (i <= rungUpTo ? { ...sl, started: true } : sl));
    const moves = catchUpBlocks(slots, clampBlockCount(entry.slotCount), osDate, workHours, new Date());
    for (const mv of moves) patchSlot(mv.index, { start: mv.start, end: mv.end, auto: true });
    // Only on open / day change; edits afterwards are the user's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, osDate, workday, session.running]);

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
    patchSlot(index, { start: plan.start, end: plan.end, started: true, auto: false });
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
    if (visible >= MAX_DAY_BLOCKS) return;
    const prev = entry.slots[visible - 1];
    // Always pre-filled (no "Set time"): 15 min after the previous block's end,
    // or now if later, rounded up to the quarter hour, 90 min long. "Now" counts
    // when the previous block actually ran or this is today's page.
    const useNow = Boolean(prev?.started) || osDate === workday;
    const times = nextBlockTimes(prev, visible, workHours, useNow ? new Date() : null);
    patchSlot(visible, { start: times.start, end: times.end, auto: true });
    patch({ slotCount: visible + 1 });
  }

  /** Any block that has not started can go (later blocks move up); one always stays. */
  function removeAt(index: number) {
    if (visible <= MIN_DAY_BLOCKS) return;
    const slot = entry.slots[index];
    if (!slot || slot.started) return;
    if (
      (slot.task.trim() || slot.outcome.trim()) &&
      !window.confirm(`Remove ${blockLabel(index)} and what you wrote in it?`)
    ) {
      return;
    }
    setMoved(null);
    removeSlot(osDate, index);
  }

  /** Carry a not-started block's task (same length) to the next work day. */
  function moveToNextDay(index: number) {
    setMoved(moveSlotToNextDay(osDate, index));
  }

  return (
    <div
      className={cn("daily-os flex flex-col gap-5", visible > 3 && "daily-os-compact")}
      data-blocks={visible}
    >
      <BlockSetupPrompt />

      <div className="daily-print-header hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
          Deep Focus from Home · Daily OS
        </p>
        <h1 className="font-display text-2xl text-olive">{hydrated ? prettyDate(osDate) : "Today"}</h1>
      </div>

      {entry.slots.slice(0, visible).map((slot, i) => {
        const active = activeHere && session.slotIndex === i;
        // Blocks that have not started can be changed, moved or removed;
        // a running block or one whose bell rang stays as it is.
        const locked = active || Boolean(slot.started);
        const length = slot.start && slot.end ? blockLength(slot) : 0;
        const lengths =
          length && !BLOCK_LENGTHS.includes(length)
            ? [...BLOCK_LENGTHS, length].sort((a, b) => a - b)
            : BLOCK_LENGTHS;
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
            <div className="daily-block-head flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                {blockLabel(i)}
              </p>
              <div className="flex items-center gap-3">
                {active ? (
                  <span className="tabular-nums text-sm font-semibold text-olive">
                    {remainingLabel(left)} left
                  </span>
                ) : doneHere || dur ? (
                  <span className="text-sm font-semibold text-olive">
                    {doneHere ? "Block complete" : null}
                    {dur ? `${doneHere ? " · " : ""}${dur}` : null}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="daily-times grid grid-cols-3 gap-3">
              <TimeField
                label="Starts"
                value={slot.start}
                fallback={defaults.start}
                // A new start keeps the block's length (Block 2 ran over → push Block 3).
                onChange={(start) =>
                  patchSlot(i, {
                    start,
                    ...(slot.start && slot.end && start
                      ? { end: endAfter(start, blockLength(slot)) }
                      : {}),
                    edited: true,
                  })
                }
                readOnly={locked}
              />
              <div className="daily-length-field print:hidden">
                <Field label="Length">
                  {locked ? (
                    // Running or rung: show what it really is, not a picker.
                    <span className="daily-length-locked flex h-11 items-center px-1 text-base text-ink">
                      {dur || "—"}
                    </span>
                  ) : (
                    <select
                      className={cn("daily-length", lengthSelectClass)}
                      aria-label={`${blockLabel(i)} length`}
                      value={length || ""}
                      disabled={!slot.start}
                      onChange={(e) =>
                        patchSlot(i, {
                          end: endAfter(slot.start, Number(e.target.value)),
                          edited: true,
                        })
                      }
                    >
                      {length ? null : <option value="">—</option>}
                      {lengths.map((m) => (
                        <option key={m} value={m}>
                          {lengthLabel(m)}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
              <TimeField
                label={slot.start && slot.end && endsNextDay(slot.start, slot.end) ? "Ends (next day)" : "Ends"}
                value={slot.end}
                fallback={endFallback}
                onChange={(end) => patchSlot(i, { end, edited: true })}
                readOnly={locked}
              />
            </div>
            {i === 0 && !active && !doneHere && !slot.started ? (
              <p className="daily-time-hint no-print -mt-1 text-sm text-muted">
                Times not right? Tap a time to change it, or just press Start and the
                bell uses the real time.
              </p>
            ) : null}
            {dur && (doneHere || (slot.start && slot.end && !active)) ? (
              // Paper only: on screen the Length field and the header show it.
              <p className="daily-duration hidden text-sm text-muted print:block print:text-ink">
                Duration: <span className="font-semibold text-olive">{dur}</span>
              </p>
            ) : null}
            <Field label="Task in this slot">
              <Input
                value={slot.task}
                placeholder="What you will sit down and do"
                aria-label={`${blockLabel(i)} task`}
                onChange={(e) => patchSlot(i, { task: e.target.value })}
              />
            </Field>
            <Field label="Outcome">
              <Input
                value={slot.outcome}
                placeholder="What done looks like"
                aria-label={`${blockLabel(i)} outcome`}
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
              {!locked && slot.task.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Move ${blockLabel(i)} to tomorrow`}
                  onClick={() => moveToNextDay(i)}
                >
                  <ArrowRight className="size-4" />
                  Move to tomorrow
                </Button>
              ) : null}
              {!locked && visible > MIN_DAY_BLOCKS ? (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove ${blockLabel(i)}`}
                  onClick={() => removeAt(i)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              ) : null}
            </div>
          </Card>
        );
      })}

      {moved ? (
        <p
          ref={movedRef}
          role="status"
          className="no-print rounded-md border border-olive/40 bg-paper px-4 py-3 text-sm text-ink"
        >
          {moved.how === "added" ? (
            <>
              Moved “{moved.task}” to {prettyDate(moved.to)}, same length.{" "}
            </>
          ) : (
            <>
              {prettyDate(moved.to)} already has {MAX_DAY_BLOCKS} blocks, so “
              {moved.task}” went into its Other things I did today note.{" "}
            </>
          )}
          <Link
            to="/daily"
            search={{ date: moved.to }}
            className="font-semibold text-olive underline underline-offset-2"
          >
            Open that day
          </Link>
        </p>
      ) : null}

      {visible < MAX_DAY_BLOCKS ? (
        <Button type="button" variant="outline" className="no-print" onClick={addBlock}>
          <Plus className="size-4" />
          Add another block
          <span className="font-normal text-muted">
            ({visible} of {MAX_DAY_BLOCKS})
          </span>
        </Button>
      ) : (
        <p className="no-print text-center text-sm text-muted">
          {MAX_DAY_BLOCKS} blocks is the most for one day. Log anything else under Other
          things I did today.
        </p>
      )}

      <Card className="daily-notes flex flex-col gap-3">
        <div className="daily-notes-fields flex flex-col gap-3">
          <NoteField
            label="Note to accountability partner"
            value={entry.partnerNote}
            onChange={(partnerNote) => patch({ partnerNote })}
            placeholder="Today I will finish…"
          />
          <NoteField
            label="Shutdown note"
            value={entry.note}
            onChange={(note) => patch({ note })}
            placeholder="What finished. What waits until tomorrow."
          />
          <NoteField
            label="Other things I did today"
            value={entry.otherNote}
            onChange={(otherNote) => patch({ otherNote })}
            placeholder="Anything beyond your blocks goes here"
          />
        </div>
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
