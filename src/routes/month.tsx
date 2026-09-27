import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Field, Textarea } from "@/components/ui/input";
import { useMonth } from "@/lib/store";

export const Route = createFileRoute("/month")({ component: MonthPage });

function MonthPage() {
  const { key, entry, patch } = useMonth();

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Monthly review"
        title="Keep one or two changes. Drop the rest."
        lede={`${key}. Look back at what went well and what didn’t. Decide what to do differently next month — not an autofill of weekly notes.`}
      />
      <Card className="flex flex-col gap-3">
        <Field label="What actually got deep work">
          <Textarea
            value={entry.worked}
            onChange={(e) => patch({ worked: e.target.value })}
          />
        </Field>
        <Field label="Biggest friction">
          <Textarea
            value={entry.friction}
            onChange={(e) => patch({ friction: e.target.value })}
          />
        </Field>
        <Field label="Keep">
          <Textarea value={entry.keep} onChange={(e) => patch({ keep: e.target.value })} />
        </Field>
        <Field label="Drop">
          <Textarea value={entry.drop} onChange={(e) => patch({ drop: e.target.value })} />
        </Field>
        <Field label="Peak window for next month">
          <Textarea
            value={entry.nextPeak}
            onChange={(e) => patch({ nextPeak: e.target.value })}
          />
        </Field>
      </Card>
    </div>
  );
}
