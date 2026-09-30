import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { InstallCard } from "@/components/install-card";
import { DailyOs } from "@/components/daily-os";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { APP_LINE, STARTER_DAYS } from "@/lib/content";
import { remainingLabel } from "@/lib/chime";
import { peakFrom, peakLine } from "@/lib/peak";
import { HomeFocusSetupSheet } from "@/components/home-focus-setup-sheet";
import { useFocusStore } from "@/lib/store";
import {
  addDaysKey,
  forceHomeFocusSetupPrompt,
  isWeekTwo,
  todayKey,
  weekdayLong,
} from "@/lib/utils";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useFocusStore((s) => s.hydrated);
  const starterStart = useFocusStore((s) => s.starterStart);
  const starterDone = useFocusStore((s) => s.starterDone);
  const homeFocusWeekTwoPrompted = useFocusStore((s) => s.homeFocusWeekTwoPrompted);
  const session = useFocusStore((s) => s.session);
  const energy = useFocusStore((s) => s.energy);
  const nextDay = STARTER_DAYS.find((d) => !starterDone.includes(d.day));
  const returning = hydrated && Boolean(starterStart);
  const showWelcome = hydrated && !starterStart;
  const nextDate = starterStart && nextDay ? addDaysKey(starterStart, nextDay.day - 1) : todayKey();
  const peak = peakFrom(energy);
  const [now, setNow] = useState(() => Date.now());
  const [showHomeFocus, setShowHomeFocus] = useState(false);
  const [homeFocusDismissed, setHomeFocusDismissed] = useState(false);

  // Week one: never force. First start-of-day in week two: Home focus setup first.
  useEffect(() => {
    if (!hydrated || homeFocusDismissed) return;
    const force = forceHomeFocusSetupPrompt();
    const due =
      force || (isWeekTwo(starterStart) && !homeFocusWeekTwoPrompted);
    setShowHomeFocus(due);
  }, [hydrated, starterStart, homeFocusWeekTwoPrompted, homeFocusDismissed]);

  useEffect(() => {
    if (!session.running || !session.endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [session.running, session.endsAt]);

  return (
    <div className="flex flex-col gap-5">
      {/* Screen-only chrome: never print marketing / starter CTAs above the Daily OS sheet */}
      {returning ? (
        <Card className="no-print">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Continue week one
          </p>
          <h2 className="mt-1 font-display text-2xl text-olive">
            {nextDay
              ? `Day ${nextDay.day} of 7 — ${nextDay.title}`
              : "Week one is done"}
          </h2>
          <p className="mt-2 text-ink">
            {nextDay ? nextDay.job : "Keep running the Daily OS. Do not add extra systems."}
          </p>
          {peak ? <p className="mt-2 text-ink">{peakLine(peak, energy.length)}</p> : null}
          {session.running && session.endsAt ? (
            <p className="mt-2 tabular-nums font-semibold text-olive">
              Block live · {remainingLabel(session.endsAt - now)} left
            </p>
          ) : null}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-sage">
            <div
              className="h-full bg-olive transition-[width] duration-300"
              style={{ width: `${(starterDone.length / 7) * 100}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {nextDay ? (
              <Button asChild>
                <Link to="/daily" search={{ date: nextDate }}>
                  Open Day {nextDay.day} OS <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link to="/starter">Starter week</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {showWelcome ? (
        <div className="no-print flex flex-col gap-5">
          <PageTitle
            kicker="Welcome aboard"
            title="New here?"
            lede="This is a small system for working from home — not a character test. Read how it works, then fill in today’s page."
          />

          <div className="overflow-hidden rounded-lg border border-yellow">
            <img
              src="/images/cover.jpg"
              width={800} height={1189} fetchPriority="high" decoding="async"
              alt="A remote worker at a clean desk, looking at a computer, no phone in view"
              className="hero-photo h-64 w-full sm:h-80"
            />
          </div>

          <Card>
            <p className="text-ink">
              Four steps, a 7-day starter, and answers to the usual questions —
              kids, missed days, the phone, where your notes live.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/intro" preload="intent">
                  How this works + FAQ <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              7-day starter
            </p>
            <p className="mt-1 font-display text-xl text-olive">Start with Day 1 today.</p>
            <p className="mt-2 text-ink">
              Claim one surface that is work-only. After you start, Today opens
              on the current day — not this welcome.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link to="/starter">
                  Open starter week <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      <div className="no-print">
        <PageTitle
          kicker={weekdayLong()}
          title="Today’s operating system"
          lede={APP_LINE}
        />
      </div>

      <DailyOs />

      {showWelcome ? (
        <div className="no-print">
          <InstallCard />
        </div>
      ) : null}

      {showHomeFocus ? (
        <HomeFocusSetupSheet
          onDone={() => {
            setHomeFocusDismissed(true);
            setShowHomeFocus(false);
          }}
        />
      ) : null}
    </div>
  );
}
