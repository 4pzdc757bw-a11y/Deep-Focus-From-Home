import { UnlockDeviceForm } from "@/components/lock-screen";
import { HandbookCheckoutLink } from "@/components/handbook-checkout-link";
import { LegalFooter } from "@/components/legal-footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { DailyOs } from "@/components/daily-os";
import { useHasAccess, useUnlockedProduct } from "@/components/lock-screen";
import { HandbookFirstCard, HandbookUnlockedCard } from "@/components/home-offer";
import { StarterSignupCard } from "@/components/starter-signup";
import { PRICE_LABEL } from "@/lib/offer";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { APP_LINE, STARTER_DAYS } from "@/lib/content";
import { remainingLabel } from "@/lib/chime";
import { peakFrom, peakLine } from "@/lib/peak";
import { HomeFocusSetupSheet } from "@/components/home-focus-setup-sheet";
import { GettingStartedSheet } from "@/components/getting-started-sheet";
import { useFocusStore } from "@/lib/store";
import {
  addDaysKey,
  cn,
  forceHomeFocusSetupPrompt,
  isWeekTwo,
  todayKey,
  weekdayLong,
} from "@/lib/utils";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useFocusStore((s) => s.hydrated);
  // Home stays free; the Daily OS on it is an app tool.
  const appUnlocked = useHasAccess("app");
  const starterStart = useFocusStore((s) => s.starterStart);
  const starterDone = useFocusStore((s) => s.starterDone);
  const homeFocusWeekTwoPrompted = useFocusStore((s) => s.homeFocusWeekTwoPrompted);
  const session = useFocusStore((s) => s.session);
  const energy = useFocusStore((s) => s.energy);
  const tourDone = useFocusStore((s) => s.tourDone);
  const tourOpen = useFocusStore((s) => s.tourOpen);
  const setTourOpen = useFocusStore((s) => s.setTourOpen);
  const [tourClosed, setTourClosed] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const nextDay = STARTER_DAYS.find((d) => !starterDone.includes(d.day));
  const returning = hydrated && Boolean(starterStart);
  // Visitors without the app always get the welcome (the free starter week can
  // set starterStart, but the Continue card is app-only).
  const showWelcome = hydrated && (!starterStart || !appUnlocked);
  // Before the store hydrates, render the welcome (CSS hides it for returning
  // browsers) or a same-size placeholder, so the Daily OS below does not jump.
  const preHydration = !hydrated;
  const nextDate = starterStart && nextDay ? addDaysKey(starterStart, nextDay.day - 1) : todayKey();
  const peak = peakFrom(energy);
  const [now, setNow] = useState(() => Date.now());
  const [showHomeFocus, setShowHomeFocus] = useState(false);
  const [homeFocusDismissed, setHomeFocusDismissed] = useState(false);
  const product = useUnlockedProduct();
  const handbookBuyer = !appUnlocked && product === "handbook";

  // Week one: never force. First start-of-day in week two: Home focus setup first.
  // Never for visitors who have not unlocked the app (it would end at a lock).
  useEffect(() => {
    if (!hydrated || homeFocusDismissed || !appUnlocked) {
      setShowHomeFocus(false);
      return;
    }
    const force = forceHomeFocusSetupPrompt();
    const due =
      force || (isWeekTwo(starterStart) && !homeFocusWeekTwoPrompted);
    setShowHomeFocus(due);
  }, [hydrated, starterStart, homeFocusWeekTwoPrompted, homeFocusDismissed, appUnlocked]);

  useEffect(() => {
    if (!session.running || !session.endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [session.running, session.endsAt]);

  return (
    <div className="flex flex-col gap-5">
      {/* Screen-only chrome: never print marketing / starter CTAs above the Daily OS sheet */}
      {returning && appUnlocked ? (
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
          {nextDay && nextDay.day === 1 ? <GuideFirstNote /> : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {nextDay ? (
              <Button asChild>
                <Link to="/daily" search={{ date: nextDate }}>
                  Start Day {nextDay.day} <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/daily" search={{ date: undefined }}>
                  Open today <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <Link
              to="/starter"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-olive underline underline-offset-4"
            >
              See all 7 days
            </Link>
          </div>
        </Card>
      ) : null}

      {preHydration && appUnlocked ? (
        <div className="df-pre-returning no-print" aria-hidden="true" />
      ) : null}

      {showWelcome || preHydration ? (
        <div
          className={cn(
            "no-print flex flex-col gap-5",
            preHydration && appUnlocked && "df-pre-welcome",
          )}
        >
          <PageTitle
            kicker="Welcome aboard"
            title="New here?"
            lede={
              appUnlocked
                ? "This is a small system for working from home — not a character test. Read how it works, then fill in today’s page."
                : handbookBuyer
                  ? "This is a small system for working from home — not a character test. Your handbook is ready: start with Chapter 1."
                  : "This is a small system for working from home — not a character test. Read how it works, then start with the handbook."
            }
          />

          {/* Visitors (e.g. from the Facebook Page button) land here: offers one tap away. */}
          {!appUnlocked && !handbookBuyer ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button size="lg" asChild>
                <HandbookCheckoutLink>
                  Get the handbook, {PRICE_LABEL} <ArrowRight className="size-4" />
                </HandbookCheckoutLink>
              </Button>
              <Link
                to="/start"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-olive underline underline-offset-4"
              >
                Or try the free 7-day starter
              </Link>
            </div>
          ) : null}

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
              {appUnlocked
                ? "Five quick setup steps, a 7-day starter, and answers to the usual questions — kids, missed days, the phone, where your notes live."
                : "Seven short chapters, one action each, and answers to the usual questions — kids, missed days, the phone, where your notes live."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {appUnlocked ? (
                <Button
                  onClick={() => {
                    setTourClosed(false);
                    setTourOpen(true);
                  }}
                >
                  Show me how to start
                </Button>
              ) : handbookBuyer ? (
                <Button asChild>
                  <Link to="/guide">Read the handbook</Link>
                </Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link to="/intro" preload="intent">
                  How this works + FAQ <ArrowRight className="size-4" />
                </Link>
              </Button>
              {!appUnlocked && !handbookBuyer ? (
                <Button
                  variant="outline"
                  aria-expanded={showUnlock}
                  onClick={() => setShowUnlock((v) => !v)}
                >
                  Already bought? Get your copy
                </Button>
              ) : null}
            </div>
            {showUnlock && !appUnlocked && !handbookBuyer ? (
              <div className="mt-4 border-t border-yellow pt-4">
                <UnlockDeviceForm />
              </div>
            ) : null}
          </Card>

          {appUnlocked ? (
            <Card>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                7-day starter
              </p>
              <p className="mt-1 font-display text-xl text-olive">Start with Day 1 today.</p>
              <p className="mt-2 text-ink">
                Claim one surface that is work-only. After you start, Today opens
                on the current day — not this welcome.
              </p>
              <GuideFirstNote />
              <div className="mt-4">
                <Button asChild>
                  <Link to="/starter">
                    Open starter week <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="no-print">
        <PageTitle
          kicker={hydrated ? weekdayLong() : "Today"}
          title="Today’s operating system"
          lede={APP_LINE}
        />
      </div>

      {appUnlocked ? (
        <DailyOs />
      ) : handbookBuyer ? (
        <HandbookUnlockedCard />
      ) : (
        <>
          <HandbookFirstCard />
          <StarterSignupCard title="Not ready to buy? Start with the free 7-day pack." />
        </>
      )}

      {hydrated &&
      appUnlocked &&
      !showHomeFocus &&
      !tourClosed &&
      (tourOpen || (!tourDone && !starterStart)) ? (
        <GettingStartedSheet onDone={() => setTourClosed(true)} />
      ) : null}

      {showHomeFocus && appUnlocked ? (
        <HomeFocusSetupSheet
          onDone={() => {
            setHomeFocusDismissed(true);
            setShowHomeFocus(false);
          }}
        />
      ) : null}
      <LegalFooter className="no-print mt-8" />
    </div>
  );
}

/** Day 1 nudge: read Guide chapters 1–4 (workspace setup) before starting the week. */
function GuideFirstNote() {
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-md border border-yellow bg-paper p-3 sm:flex-row sm:items-center">
      <p className="text-sm text-ink sm:flex-1">
        Before you start your week, read Guide chapters 1–4. They show you how to set up your
        workspace.
      </p>
      <Button variant="outline" size="sm" asChild>
        <Link to="/guide/$slug" params={{ slug: "intro" }}>
          <BookOpen className="size-4" /> Read chapter 1
        </Link>
      </Button>
    </div>
  );
}
