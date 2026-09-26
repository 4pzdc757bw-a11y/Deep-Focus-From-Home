import { Bell, BellRing, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DAILY_CHECKS } from "@/lib/content";
import type { DailyCheckId } from "@/lib/content";
import { parseClock, remainingLabel } from "@/lib/chime";
import { beginSession, completeSession } from "@/lib/session-runtime";
import { partnerMessage } from "@/lib/backup";
import { shareOrCopy } from "@/lib/share";
import { emptySlot, useDaily, useFocusStore } from "@/lib/store";
import { cn, prettyDate, todayKey } from "@/lib/utils";

const SLOT_LABELS = ["Block 1", "Block 2", "Block 3"] as const;
const NEXT_DEFAULTS = [
  { start: "09:00", end: "10:30" },
  { start: "11:00", end: "12:30" },
  { start: "14:00", end: "15:30" },
] as const;

function endTimestamp(start: string, end: string) {
  const now = new Date();
  const endAt = parseClock(end, now);
  if (endAt && endAt.getTime() > now.getTime() + 30_000) return endAt.getTime();
  const startAt = parseClock(start, now);
  const from = startAt && startAt.getTime() > now.getTime() ? startAt : now;
  return from.getTime() + 90 * 60 * 1000;
}

function TimeField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      {value ? (
        <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <button
          type="button"
          className="h-11 w-full rounded-md border border-dashed border-yellow bg-paper px-3 text-left text-muted"
          onClick={() => onChange(fallback)}
        >
          Set time
        </button>
      )}
    </Field>
  );
}

export function DailyOs({ date }: { date?: string }) {
  const osDate = date ?? todayKey();
  const { entry, patch, patchSlot } = useDaily(osDate);
  const session = useFocusStore((s) => s.session);
  const [now, setNow] = useState(() => Date.now());
  const [ringing, setRinging] = useState(false);
  const [shareState, setShareState] = useState("");

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

  async function startSlot(index: number) {
    const slot = entry.slots[index];
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1400);
    await beginSession({
      date: osDate,
      slotIndex: index,
      endsAt: endTimestamp(slot.start, slot.end),
    });
  }

  async function finishNow() {
    setRinging(true);
    window.setTimeout(() => setRinging(false), 1800);
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
    <>
      {entry.slots.slice(0, visible).map((slot, i) => {
        const active = activeHere && session.slotIndex === i;
        const doneHere =
          session.phase === "done" && session.date === osDate && session.slotIndex === i;
        return (
          <Card key={i} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                {SLOT_LABELS[i]}
              </p>
              {active ? (
                <span className="tabular-nums text-sm font-semibold text-olive">
                  {remainingLabel(left)} left
                </span>
              ) : doneHere ? (
                <span className="text-sm font-semibold text-olive">Block complete</span>
              ) : i > 0 && i === visible - 1 ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-gold"
                  onClick={removeLast}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TimeField
                label="Starts"
                value={slot.start}
                fallback={NEXT_DEFAULTS[i].start}
                onChange={(start) => patchSlot(i, { start })}
              />
              <TimeField
                label="Ends"
                value={slot.end}
                fallback={NEXT_DEFAULTS[i].end}
                onChange={(end) => patchSlot(i, { end })}
              />
            </div>
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
              <p className="text-sm text-muted">
                The screen stays awake for this block. If you lock the phone, the
                bell rings when you open the app again.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
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
        <Button type="button" variant="outline" onClick={addBlock}>
          <Plus className="size-4" />
          Add another block
        </Button>
      ) : null}

      <Card className="flex flex-col gap-3">
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

      <Card className="flex flex-col gap-3">
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
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print this day
          </Button>
        </div>
        {shareState ? <p className="no-print text-sm text-olive">{shareState}</p> : null}
      </Card>
    </>
  );
}
