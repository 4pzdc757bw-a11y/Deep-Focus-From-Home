import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, PageTitle } from "@/components/app-shell";
import {
  EnergyScalePicker,
  formatEnergyScore,
} from "@/components/energy-scale";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { peakFrom, peakLine } from "@/lib/peak";
import { useFocusStore, type EnergyRow } from "@/lib/store";
import { checkInStamp, periodNow, TIME_OF_DAY_OPTIONS } from "@/lib/time-of-day";
import { cn, prettyDate, todayKey } from "@/lib/utils";

export const Route = createFileRoute("/energy")({ component: EnergyPage });

/** Saved time for a row; older rows carry it in the id prefix. */
function rowTime(r: EnergyRow) {
  if (typeof r.at === "number") return r.at;
  const fromId = Number.parseInt(r.id, 10);
  return Number.isFinite(fromId) && fromId > 1_500_000_000_000 ? fromId : null;
}

function EnergyPage() {
  const rows = useFocusStore((s) => s.energy);
  const add = useFocusStore((s) => s.addEnergy);
  const remove = useFocusStore((s) => s.removeEnergy);
  const [energy, setEnergy] = useState(4);
  const [focus, setFocus] = useState(4);
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  // Local clock only after mount (the server's time zone is not the user's).
  const [now, setNow] = useState<Date | null>(null);
  const slotTouched = useRef(false);
  const peak = peakFrom(rows);
  // Newest first, whether saved here or from the after-block prompt.
  const sorted = [...rows].sort(
    (a, b) => (rowTime(b) ?? Date.parse(b.date)) - (rowTime(a) ?? Date.parse(a.date)),
  );

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      // Auto-pick Morning / Afternoon / Evening from the clock until the user edits it.
      if (!slotTouched.current) setSlot(periodNow(d));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  function chooseSlot(value: string) {
    slotTouched.current = true;
    setSlot(value);
  }

  function loadExample() {
    chooseSlot("9–11 morning");
    setEnergy(4.5);
    setFocus(5);
    setNote("Slept well. No Slack until first block. Hardest draft felt easy.");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Chapter 7"
        title="Energy and focus log"
        lede="Three days is enough to see a peak window. Put next week’s hardest work there."
      />
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Peak window
        </p>
        <p className="mt-1 font-display text-2xl text-olive">
          {peak ? peak.slot : "Not named yet"}
        </p>
        <p className="mt-2 text-ink">{peakLine(peak, rows.length)}</p>
        <p className="mt-3 text-sm text-muted">
          From the handbook — Chapter 7: log morning, midday, and late afternoon
          for a few days, then protect the peak.{" "}
          <Link to="/guide" className="font-semibold text-olive">
            Open the guide
          </Link>
          .
        </p>
      </Card>
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            New check-in
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-gold"
            onClick={loadExample}
          >
            Fill Chapter 7 example
          </button>
        </div>
        <p className="font-semibold text-olive" aria-live="polite">
          {now ? checkInStamp(now) : "\u00a0"}
        </p>
        <Field label="Time of day">
          <Input
            value={slot}
            onChange={(e) => chooseSlot(e.target.value)}
            placeholder="Morning / 9–11 / after lunch"
          />
        </Field>
        <div className="-mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Time of day">
          {TIME_OF_DAY_OPTIONS.map((option) => {
            const selected = slot.trim().toLowerCase() === option.toLowerCase();
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseSlot(option)}
                className={cn(
                  "min-h-11 rounded-md border px-3 text-sm font-semibold transition-colors",
                  selected
                    ? "border-olive bg-olive text-cream"
                    : "border-yellow bg-paper text-olive hover:border-gold",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        <EnergyScalePicker
          label="Energy"
          value={energy}
          onChange={setEnergy}
          example="1 drained · 3 steady · 5 charged"
        />
        <EnergyScalePicker
          label="Focus"
          value={focus}
          onChange={setFocus}
          example="1 scattered · 3 usable · 5 locked in"
        />
        <Field label="Note">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What helped or drained you in this window"
          />
        </Field>
        <p className="text-sm text-muted">
          Selected: Energy {formatEnergyScore(energy)} · Focus{" "}
          {formatEnergyScore(focus)}
        </p>
        <Button
          onClick={() => {
            const at = new Date();
            add({
              date: todayKey(at),
              slot: slot.trim() || periodNow(at),
              energy,
              focus,
              note,
              at: at.getTime(),
            });
            setNote("");
            slotTouched.current = false;
            setSlot(periodNow(at));
          }}
        >
          Save this check-in
        </Button>
      </Card>
      <section className="flex flex-col gap-3" aria-labelledby="recent-check-ins">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="recent-check-ins" className="font-display text-2xl text-olive">
            Recent check-ins
          </h2>
          <p className="text-sm text-muted">
            {rows.length} saved · all count toward your peak
          </p>
        </div>
        {sorted.length === 0 ? (
          <p className="text-muted">
            No check-ins yet. Save one above, or log energy when a Daily OS block
            ends — both land here. Tap a number (half steps OK), or load the
            Chapter 7 example.
          </p>
        ) : (
          sorted.map((r) => {
            const t = rowTime(r);
            return (
              <Card key={r.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-gold">
                    {t ? checkInStamp(t) : prettyDate(r.date)} · {r.slot}
                  </p>
                  <p className="mt-1 text-olive">
                    Energy {formatEnergyScore(r.energy)} · Focus{" "}
                    {formatEnergyScore(r.focus)}
                  </p>
                  {r.note ? <p className="mt-1 text-ink">{r.note}</p> : null}
                </div>
                <button
                  type="button"
                  className="grid size-11 place-items-center text-muted"
                  aria-label="Remove"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
