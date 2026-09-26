import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";

export const Route = createFileRoute("/household")({ component: HouseholdPage });

function HouseholdPage() {
  const h = useFocusStore((s) => s.household);
  const set = useFocusStore((s) => s.setHousehold);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Chapter 2"
        title="Household focus agreement"
        lede="Presence is not availability. Write the hours, the signal, and what counts as an emergency. Print the kid version for the fridge."
      />
      <div className="no-print">
        <Button type="button" onClick={() => window.print()}>
          Print fridge copy
        </Button>
      </div>
      <Card className="flex flex-col gap-3 print:hidden">
        <Field label="Core hours">
          <Input
            value={h.hours}
            onChange={(e) => set({ hours: e.target.value })}
            placeholder="9:00–12:00 and 13:30–16:00"
          />
        </Field>
        <Field label="Visible signal">
          <Input
            value={h.signal}
            onChange={(e) => set({ signal: e.target.value })}
            placeholder="Closed door + headphones / red card"
          />
        </Field>
        <Field label="What counts as an emergency">
          <Textarea
            value={h.emergency}
            onChange={(e) => set({ emergency: e.target.value })}
          />
        </Field>
        <Field label="Chores during work hours">
          <Textarea
            value={h.chores}
            onChange={(e) => set({ chores: e.target.value })}
          />
        </Field>
        <Field label="Kid version">
          <Textarea
            value={h.kidVersion}
            onChange={(e) => set({ kidVersion: e.target.value })}
          />
        </Field>
        <Field label="Signed by (names in this house)">
          <Input
            value={h.signedBy}
            onChange={(e) => set({ signedBy: e.target.value })}
          />
        </Field>
      </Card>

      <Card className="print:border-olive">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Fridge copy
        </p>
        <h2 className="mt-1 font-display text-2xl text-olive">When the signal is on</h2>
        <p className="mt-3 text-lg leading-relaxed text-ink">
          {h.kidVersion || "Write the kid version above. This card is what goes on the fridge."}
        </p>
        {h.hours ? (
          <p className="mt-4 text-ink">
            <span className="font-semibold text-olive">Hours: </span>
            {h.hours}
          </p>
        ) : null}
        {h.signal ? (
          <p className="mt-1 text-ink">
            <span className="font-semibold text-olive">Signal: </span>
            {h.signal}
          </p>
        ) : null}
        {h.emergency ? (
          <p className="mt-1 text-ink">
            <span className="font-semibold text-olive">Emergency: </span>
            {h.emergency}
          </p>
        ) : null}
        {h.signedBy ? (
          <p className="mt-4 text-sm text-muted">Signed by {h.signedBy}</p>
        ) : null}
      </Card>
    </div>
  );
}
