import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useWeek } from "@/lib/store";

export const Route = createFileRoute("/week")({ component: WeekPage });

function WeekPage() {
  const { key, entry, patch } = useWeek();
  const labels = ["Block 1", "Block 2", "Block 3", "Block 4"];

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Weekly planner"
        title="Protect the blocks before the week starts"
        lede={`Week of ${key}. Two to four immovable sessions. One coworking appointment. Always editable here — Friday Close also opens this planner for next week.`}
      />
      <Card className="flex flex-col gap-3">
        <Field label="This week’s theme">
          <Input
            value={entry.theme}
            onChange={(e) => patch({ theme: e.target.value })}
            placeholder="Ship the outline / close the sprint / deep research"
          />
        </Field>
        {entry.blocks.map((b, i) => (
          <Field key={i} label={labels[i] ?? `Block ${i + 1}`}>
            <Input
              value={b}
              onChange={(e) => {
                const next = [...entry.blocks] as [string, string, string, string];
                next[i] = e.target.value;
                patch({ blocks: next });
              }}
              placeholder="Tue 9:00–10:30 · draft chapter 2"
            />
          </Field>
        ))}
        <Field label="Body-doubling / coworking">
          <Input
            value={entry.coworking}
            onChange={(e) => patch({ coworking: e.target.value })}
          />
        </Field>
        <Field label="Friday review">
          <Textarea
            value={entry.fridayNote}
            onChange={(e) => patch({ fridayNote: e.target.value })}
            placeholder="What the blocks produced. What to keep next week."
          />
        </Field>
      </Card>
    </div>
  );
}
