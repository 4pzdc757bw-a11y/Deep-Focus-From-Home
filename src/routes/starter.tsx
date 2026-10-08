import { LegalFooter } from "@/components/legal-footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Download } from "lucide-react";
import { useRef } from "react";
import { useHasAccess } from "@/components/lock-screen";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/input";
import { STARTER_DAYS } from "@/lib/content";
import { useFocusStore } from "@/lib/store";
import { StarterSignupCard } from "@/components/starter-signup";
import { prettyDate, todayKey } from "@/lib/utils";
import { starterDayDates } from "@/lib/work-hours";

export const Route = createFileRoute("/starter")({ component: StarterPage });

function StarterPage() {
  const done = useFocusStore((s) => s.starterDone);
  const notes = useFocusStore((s) => s.starterNotes);
  const toggle = useFocusStore((s) => s.toggleStarterDay);
  const setNote = useFocusStore((s) => s.setStarterNote);
  const start = useFocusStore((s) => s.startStarter);
  const setStart = useFocusStore((s) => s.setStarterStart);
  const started = useFocusStore((s) => s.starterStart);
  const origin = started ?? todayKey();
  const workDays = useFocusStore((s) => s.household?.workDays);
  // Day 1 on the start date, Days 2–7 on the next picked work days.
  const dayDates = starterDayDates(origin, workDays);
  // The starter week is the free 7-day pack. The Daily OS links are app-only.
  const appUnlocked = useHasAccess("app");

  return (
    <div className="flex flex-col gap-5">
      <div role="note" className="rounded-md border border-yellow bg-paper p-3 text-sm text-ink">
        <p className="font-semibold text-olive">Just signed up?</p>
        <p className="mt-1">
          Look for an email from Jeffrey at Deep Focus from Home called “Confirm your free 7-day
          pack” and tap the button. Not in your inbox? Check Junk, Spam or Promotions, and move it
          to your Inbox so the daily emails get through.
        </p>
      </div>
      <PageTitle
        kicker="Week one"
        title="Seven days. One job each day."
        lede={
          appUnlocked
            ? "Do not add extra systems this week. Finish the job, open that day’s OS, tick the day, stop."
            : "Your free 7-day pack. Do not add extra systems this week. Finish the job, tick the day, write one line, stop."
        }
      />
      {appUnlocked ? null : (
        <p className="-mt-3 text-sm text-muted">
          Prefer paper?{" "}
          <a
            href="/downloads/7-day-starter-pack.pdf"
            download
            className="inline-flex items-center gap-1 font-semibold text-olive underline underline-offset-4"
          >
            <Download className="size-4" /> Download the 7-day pack (PDF)
          </a>
        </p>
      )}
      {appUnlocked ? null : <StarterSignupCard title="Get each day by email, too." />}
      {!started ? (
        <Button onClick={start}>Start week one today</Button>
      ) : (
        <WeekOneStart started={started} onChange={setStart} />
      )}
      {STARTER_DAYS.map((d) => {
        const isDone = done.includes(d.day);
        const date = dayDates[d.day - 1]!;
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
            {appUnlocked ? (
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
            ) : null}
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

/** "Friday, Oct 2" for a YYYY-MM-DD key. */
function longDate(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * "Week one starts Friday, Oct 2" in the site's field style. The real date
 * input sits invisibly on top of the styled field, so a tap opens the
 * device's own date picker on phones; on computers we also call showPicker().
 */
function WeekOneStart({
  started,
  onChange,
}: {
  started: string;
  onChange: (date: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isToday = started === todayKey();

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
    }
  }

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="starter-start"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-gold"
        >
          Week one starts
        </label>
        <div className="group relative w-full sm:w-72">
          <div
            aria-hidden="true"
            className="flex h-11 items-center gap-2 rounded-md border border-yellow bg-paper px-3 text-base text-ink group-focus-within:border-gold group-focus-within:ring-2 group-focus-within:ring-gold/30"
          >
            <CalendarDays className="size-4 shrink-0 text-olive" />
            <span className="font-semibold text-olive">{longDate(started)}</span>
            {isToday ? <span className="text-sm text-muted">· today</span> : null}
          </div>
          <input
            ref={inputRef}
            id="starter-start"
            type="date"
            value={started}
            required
            onClick={openPicker}
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={openPicker}
          className="min-h-10 font-semibold text-olive underline underline-offset-4"
        >
          Change date
        </button>
        {isToday ? null : (
          <button
            type="button"
            onClick={() => onChange(todayKey())}
            className="min-h-10 font-semibold text-olive underline underline-offset-4"
          >
            Start today instead
          </button>
        )}
      </div>
    </Card>
  );
}
