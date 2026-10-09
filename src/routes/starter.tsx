import { LegalFooter } from "@/components/legal-footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Download } from "lucide-react";
import { useRef } from "react";
import { useHasAccess } from "@/components/lock-screen";
import { HandbookCheckoutLink } from "@/components/handbook-checkout-link";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import {
  STARTER_DAYS,
  STARTER_HANDBOOK_ADDS,
  STARTER_HOW_IT_WORKS,
  STARTER_PDF,
  STARTER_WRITE_INS,
} from "@/lib/content";
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
  const writeIns = useFocusStore((s) => s.starterWriteIns);
  const setWriteIn = useFocusStore((s) => s.setStarterWriteIn);
  const start = useFocusStore((s) => s.startStarter);
  const setStart = useFocusStore((s) => s.setStarterStart);
  const started = useFocusStore((s) => s.starterStart);
  const origin = started ?? todayKey();
  const workDays = useFocusStore((s) => s.household?.workDays);
  // Day 1 on the start date, Days 2–7 on the next picked work days.
  const dayDates = starterDayDates(origin, workDays);
  // The starter week is the free 7-day pack. The Daily OS links are app-only.
  const appUnlocked = useHasAccess("app");
  // Handbook (or app) buyers already have everything in the "what it adds" box.
  const handbookUnlocked = useHasAccess("handbook");

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
        <Card className="flex flex-col gap-3 border-2 border-olive">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            First step
          </p>
          <Button asChild size="lg" className="h-auto min-h-12 w-full py-3 text-base sm:w-auto sm:self-start">
            <a href={STARTER_PDF} download>
              <Download className="size-5 shrink-0" /> Download your fillable 7-day pack (PDF)
            </a>
          </Button>
          <p className="text-ink">Or fill it in right here on this page, day by day.</p>
        </Card>
      )}
      {appUnlocked ? null : (
        <Card className="flex flex-col gap-2 border-l-4 border-l-olive">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            How this week works
          </h2>
          {STARTER_HOW_IT_WORKS.map((line) => (
            <p key={line} className="text-ink">
              {line}
            </p>
          ))}
        </Card>
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
            <StarterWriteIns
              day={d.day}
              values={writeIns?.[d.day] ?? {}}
              onChange={(field, value) => {
                if (!started) start();
                setWriteIn(d.day, field, value);
              }}
            />
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
      {handbookUnlocked ? null : <HandbookAddsCard />}
      <LegalFooter className="mt-8" />
    </div>
  );
}

/**
 * After Day 7: what the $17 handbook adds beyond the free pack (same copy as
 * page 8 of the PDF). The button goes straight to the live handbook Stripe
 * Payment Link, the same one /buy uses (falls back to /buy if it isn't set).
 */
function HandbookAddsCard() {
  const adds = STARTER_HANDBOOK_ADDS;
  return (
    <Card className="flex flex-col gap-3 border-2 border-olive">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
        After week one
      </p>
      <h2 className="font-display text-2xl text-olive">{adds.heading}</h2>
      {adds.lead.map((line) => (
        <p key={line} className="text-ink">
          {line}
        </p>
      ))}
      <ul className="flex flex-col gap-1.5 text-ink">
        {adds.bullets.map((b) => (
          <li key={b} className="border-l-2 border-yellow pl-3">
            {b}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:items-start">
        <Button asChild size="lg" className="w-full sm:w-auto">
          <HandbookCheckoutLink>
            {adds.button} <ArrowRight className="size-4" />
          </HandbookCheckoutLink>
        </Button>
        <p className="text-sm text-muted">{adds.payNote}</p>
        <Link
          to="/buy"
          className="text-sm font-semibold text-olive underline underline-offset-4"
        >
          {adds.bothOptions}
        </Link>
      </div>
    </Card>
  );
}

/** Labeled boxes for the steps that ask you to write or choose something. Saved in this browser. */
function StarterWriteIns({
  day,
  values,
  onChange,
}: {
  day: number;
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}) {
  const spec = STARTER_WRITE_INS[day];
  if (!spec || spec.fields.length === 0) return null;
  const grid = spec.fields.every((f) => f.kind === "time");
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-yellow bg-paper/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-olive">
        Write it here
      </legend>
      <div className={grid ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
        {spec.fields.map((f) => {
          const id = `starter-${day}-${f.id}`;
          const value = values[f.id] ?? "";
          return (
            <div key={f.id} className="flex flex-col gap-1.5">
              <label
                htmlFor={id}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-gold"
              >
                {f.label}
              </label>
              {f.kind === "long" ? (
                <Textarea
                  id={id}
                  className="min-h-20"
                  placeholder={f.placeholder}
                  value={value}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              ) : (
                <Input
                  id={id}
                  type={f.kind === "time" ? "time" : "text"}
                  placeholder={f.placeholder}
                  value={value}
                  onChange={(e) => onChange(f.id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      {spec.note ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-olive">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" /> {spec.note}
        </p>
      ) : null}
    </fieldset>
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
