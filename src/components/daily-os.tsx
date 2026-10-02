import { Bell, BellRing, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/app-shell";
import { CloseDayButton } from "@/components/close-day-button";
import { EnergyCheckInSheet, type EnergyCheckInContext } from "@/components/energy-check-in-sheet";
import { slotLabelFromBlock } from "@/components/energy-scale";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DAILY_CHECKS } from "@/lib/content";
import type { DailyCheckId } from "@/lib/content";
import {
  durationLabel,
  durationMinutes,
  remainingLabel,
  stampClockNow,
} from "@/lib/chime";
import { installPrintTextareaFit, printDaily } from "@/lib/print";
import { blockDefaults, endForStart } from "@/lib/work-hours";
import { beginSession, completeSession } from "@/lib/session-runtime";
import { partnerMessage } from "@/lib/backup";
import { shareOrCopy } from "@/lib/share";
import { emptySlot, useDaily, useFocusStore } from "@/lib/store";
import { cn, prettyDate, todayKey } from "@/lib/utils";

const SLOT_LABELS = ["Block 1", "Block 2", "Block 3"] as const;

const DEFAULT_BLOCK_MINUTES = 90;
const MAX_BLOCK_MINUTES = 4 * 60;

/** Planned length from the block's prefilled/typed times; 90 min if unusable. */
function plannedMinutes(start: string, end: string) {
  if (!start || !end || end <= start) return DEFAULT_BLOCK_MINUTES;
  const mins = durationMinutes(start, end);
  if (mins == null || mins < 5 || mins > MAX_BLOCK_MINUTES) return DEFAULT_BLOCK_MINUTES;
  return mins;
}

/**
 * When Start is pressed: stamp start = now. Keep the planned end only if it is
 * still later today; otherwise end = now + planned length (cleared if that
 * would cross midnight, so it shows "Set time"). Never leaves an end earlier
 * than the start, so no negative / wrapped duration.
 */
function startPlan(slot: { start: string; end: string }, now = new Date()) {
  const start = stampClockNow(now);
  const planned = plannedMinutes(slot.start, slot.end);
  const minEnd = stampClockNow(new Date(now.getTime() + 60_000));
  if (slot.end && slot.end >= minEnd && slot.end > start) {
    const [h, m] = slot.end.split(":").map(Number);
    const endAt = new Date(now);
    endAt.setHours(h, m, 0, 0);
    return { start, end: slot.end, endsAt: endAt.getTime() };
  }
  const endsAt = now.getTime() + planned * 60_000;
  const endDate = new Date(endsAt);
  const sameDay = endDate.getDate() === now.getDate();
  return { start, end: sameDay ? stampClockNow(endDate) : "", endsAt };
}

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

export function DailyOs({ date }: { date?: string }) {
  const hydrated = useFocusStore((s) => s.hydrated);
  const osDate = date ?? todayKey();
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

  // Cmd+P / Ctrl+P too: fit notes to their content while printing.
  useEffect(() => {
    installPrintTextareaFit();
  }, []);

  const visible = Math.min(3, Math.max(1, entry.slotCount ?? 1)) as 1 | 2 | 3;
  const activeHere = session.running && session.date === osDate;

  useEffect(() => {
    if (!activeHere || !session.endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [activeHere, session.endsAt]);

  const left = activeHere && session.endsAt ? session.endsAt - now : 0;

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
    patchSlot(index, { start: plan.start, end: plan.end });
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1400);
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
          Deep Focus · Daily OS
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
                onChange={(start) => patchSlot(i, { start })}
                readOnly={active}
              />
              <TimeField
                label="Ends"
                value={slot.end}
                fallback={endFallback}
                onChange={(end) => patchSlot(i, { end })}
                readOnly={active}
              />
            </div>
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
            {active ? (
              <p className="no-print text-sm text-muted">
                The screen stays awake for this block. If you lock the phone, the
                bell rings when you open the app again.
              </p>
            ) : null}
            <div className="no-print flex flex-wrap gap-2">
              {active ? (
                <Button type="button" onClick={() => void finishNow()}>
                  <BellRing className={cn("size-4", ringing && "animate-pulse")} />
                  Done — ring the bell
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

      <Card className="daily-checks flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Daily checks
        </p>
        {DAILY_CHECKS.map((c) => (
          <CheckRow
            key={c.id}
            label={c.label}
            checked={entry.checks[c.id]}
            onCheckedChange={(v) =>
              patch({ checks: { ...entry.checks, [c.id as DailyCheckId]: v } })
            }
          />
        ))}
      </Card>

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
