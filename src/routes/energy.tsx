import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, PageTitle } from "@/components/app-shell";
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
      </Card>
      <Card className="flex flex-col gap-3">
        <Field label="Time of day">
          <Input
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder="Morning / 9–11 / after lunch"
          />
        </Field>
        <Field label={`Energy ${energy}`}>
          <input
            type="range"
            min={1}
            max={5}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className="w-full accent-olive"
            aria-label="Energy 1 to 5"
          />
        </Field>
        <Field label={`Focus ${focus}`}>
          <input
            type="range"
            min={1}
            max={5}
            value={focus}
            onChange={(e) => setFocus(Number(e.target.value))}
            className="w-full accent-olive"
            aria-label="Focus 1 to 5"
          />
        </Field>
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
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
        <p className="text-muted">No rows yet. Log morning, midday, and late afternoon.</p>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-gold">
                {prettyDate(r.date)} · {r.slot}
              </p>
              <p className="mt-1 text-olive">
                Energy {r.energy} · Focus {r.focus}
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
