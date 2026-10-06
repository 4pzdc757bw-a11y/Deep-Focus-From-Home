import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Field, Input, Textarea } from "@/components/ui/input";
import { WeekBlocksEditor, hasAnyBlock, suggestedWeekLines } from "@/components/week-blocks-editor";
import { useFocusStore, useWeek } from "@/lib/store";
import { prettyDate } from "@/lib/utils";

export const Route = createFileRoute("/week")({ component: WeekPage });

function WeekPage() {
  const { key, entry, patch } = useWeek();
  const hydrated = useFocusStore((s) => s.hydrated);
  const markBlockSetupDone = useFocusStore((s) => s.markBlockSetupDone);
  // Nothing planned yet: show blocks from the user's own schedule (saved on first change).
  const suggested = hydrated && !hasAnyBlock(entry.blocks);
  const blocks = suggested ? suggestedWeekLines(key) : entry.blocks;

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Weekly planner"
        title="Protect the blocks before the week starts"
        lede={`Week of ${prettyDate(key)}. Pick a day and give it its own blocks. One coworking appointment. Always editable here — Friday Close also opens this planner for next week.`}
      />
      <p className="week-setup-line rounded-md border border-yellow bg-paper px-4 py-3 text-ink">
        <span className="font-semibold text-olive">Make your blocks match your real day.</span> Set
        up each day here the way it really runs: block times, lengths, meetings. Every day can be
        different, and each day’s page starts from its own plan.
      </p>
      <Card className="flex flex-col gap-3">
        <Field label="This week’s outcome">
          <Input
            value={entry.theme}
            onChange={(e) => patch({ theme: e.target.value })}
            placeholder="Ship the outline / close the sprint / deep research"
          />
        </Field>
        {suggested ? (
          <p className="text-sm text-muted">
            Filled in from your schedule. Change anything; it saves as you go.
          </p>
        ) : null}
        <WeekBlocksEditor
          blocks={blocks}
          onChange={(next) => {
            patch({ blocks: next });
            markBlockSetupDone();
          }}
        />
        <Field label="Body-doubling / coworking">
          <Input
            value={entry.coworking}
            onChange={(e) => patch({ coworking: e.target.value })}
            placeholder="Tue 10:00 AM · Focusmate / friend"
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
