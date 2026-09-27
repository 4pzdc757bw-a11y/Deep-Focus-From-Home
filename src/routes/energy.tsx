import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, PageTitle } from "@/components/app-shell";
import {
  EnergyScalePicker,
  formatEnergyScore,
} from "@/components/energy-scale";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { peakFrom, peakLine } from "@/lib/peak";
import { useFocusStore } from "@/lib/store";
import { prettyDate, todayKey } from "@/lib/utils";

export const Route = createFileRoute("/energy")({ component: EnergyPage });

function EnergyPage() {
  const rows = useFocusStore((s) => s.energy);
  const add = useFocusStore((s) => s.addEnergy);
  const remove = useFocusStore((s) => s.removeEnergy);
  const [energy, setEnergy] = useState(4);
  const [focus, setFocus] = useState(4);
  const [slot, setSlot] = useState("Morning");
  const [note, setNote] = useState("");
  const peak = peakFrom(rows);

  function loadExample() {
    setSlot("9–11 morning");
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
        <Field label="Time of day">
          <Input
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder="Morning / 9–11 / after lunch"
          />
        </Field>
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
            add({ date: todayKey(), slot, energy, focus, note });
            setNote("");
          }}
        >
          Save this check-in
        </Button>
      </Card>
      {rows.length === 0 ? (
        <p className="text-muted">
          No rows yet. Tap a number (half steps OK), or load the Chapter 7
          example above.
        </p>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-gold">
                {prettyDate(r.date)} · {r.slot}
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
        ))
      )}
    </div>
  );
}
