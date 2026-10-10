import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { WeekBlocksEditor, hasAnyBlock, suggestedWeekLines } from "@/components/week-blocks-editor";
import { useFocusStore, useWeek } from "@/lib/store";
import { tidyWeekBlocks } from "@/lib/week-blocks";
import { prettyDate } from "@/lib/utils";

export const Route = createFileRoute("/week")({ component: WeekPage });

function WeekPage() {
  const { key, entry, patch } = useWeek();
  const hydrated = useFocusStore((s) => s.hydrated);
  const markBlockSetupDone = useFocusStore((s) => s.markBlockSetupDone);
  // Nothing planned yet: show blocks from the user's own schedule (saved on first change).
  const suggested = hydrated && !hasAnyBlock(entry.blocks);
  const blocks = suggested ? suggestedWeekLines(key) : entry.blocks;
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Commit every edit (blur + trim), confirm, then go to today's Daily page. */
  function saveWeek() {
    if (saved) return;
    // Blur first so the open box commits its own trim before we read the store.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const cur = useFocusStore.getState().weeks[key] ?? entry;
    const lines = hasAnyBlock(cur.blocks) ? cur.blocks : blocks;
    patch({
      theme: cur.theme.trim(),
      blocks: tidyWeekBlocks(lines),
      coworking: cur.coworking.trim(),
      fridayNote: cur.fridayNote.trim(),
    });
    markBlockSetupDone();
    setSaved(true);
    timer.current = window.setTimeout(() => {
      void navigate({ to: "/daily", search: { date: undefined } });
    }, 1200);
  }

  const saveButton = (
    <Button type="button" onClick={saveWeek} disabled={saved}>
      Save week
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/daily"
          search={{ date: undefined }}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive"
        >
          <ArrowLeft className="size-4" />
          Back to today
        </Link>
        {saveButton}
      </div>
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
      <div className="no-print flex flex-col items-start gap-2">
        {saveButton}
        <p className="text-sm text-muted">Saves this week and takes you to today’s page.</p>
      </div>
      {saved ? (
        <div
          role="status"
          className="no-print fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-md border border-olive bg-olive px-5 py-3 font-semibold text-cream shadow-lg"
        >
          Week saved.
        </div>
      ) : null}
    </div>
  );
}
