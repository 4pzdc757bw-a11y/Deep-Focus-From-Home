import { LegalFooter } from "@/components/legal-footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/input";
import { STARTER_DAYS } from "@/lib/content";
import { useFocusStore } from "@/lib/store";
import { addDaysKey, prettyDate, todayKey } from "@/lib/utils";

export const Route = createFileRoute("/starter")({ component: StarterPage });

function StarterPage() {
  const done = useFocusStore((s) => s.starterDone);
  const notes = useFocusStore((s) => s.starterNotes);
  const toggle = useFocusStore((s) => s.toggleStarterDay);
  const setNote = useFocusStore((s) => s.setStarterNote);
  const start = useFocusStore((s) => s.startStarter);
  const started = useFocusStore((s) => s.starterStart);
  const origin = started ?? todayKey();

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Week one"
        title="Seven days. One job each day."
        lede="Do not add extra systems this week. Finish the job, open that day’s OS, tick the day, stop."
      />
      {!started ? (
        <Button onClick={start}>Start week one today</Button>
      ) : (
        <p className="text-sm text-muted">Started {prettyDate(started)}</p>
      )}
      {STARTER_DAYS.map((d) => {
        const isDone = done.includes(d.day);
        const date = addDaysKey(origin, d.day - 1);
        return (
          <Card key={d.day} className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Day {d.day} — {d.title} · {prettyDate(date)}
            </p>
            <h2 className="font-display text-2xl text-olive">{d.job}</h2>
            <p className="text-ink">{d.why}</p>
            <ul className="flex flex-col gap-1.5 text-ink">
              {d.actions.map((a) => (
                <li key={a} className="border-l-2 border-yellow pl-3">
                  {a}
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild>
              <Link
                to="/daily"
                search={{ date }}
                onClick={() => {
                  if (!started) start();
                }}
              >
                Open Day {d.day} OS <ArrowRight className="size-4" />
              </Link>
            </Button>
            <CheckRow
              checked={isDone}
              onCheckedChange={() => {
                if (!started) start();
                toggle(d.day);
              }}
              label={isDone ? "Done for this week" : "Mark this day done"}
            />
            <Textarea
              placeholder="One line about what you actually did…"
              value={notes[d.day] ?? ""}
              onChange={(e) => setNote(d.day, e.target.value)}
            />
          </Card>
        );
      })}
      <LegalFooter className="mt-8" />
    </div>
  );
}
