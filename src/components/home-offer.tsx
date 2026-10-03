import { Link } from "@tanstack/react-router";
import { BookOpen, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/app-shell";
import { UnlockDeviceForm, useAppPitchAllowed } from "@/components/lock-screen";
import { Button } from "@/components/ui/button";
import { APP_ACCESS_LINE, APP_PRICE_LABEL, PRICE_LABEL } from "@/lib/offer";

/** Home for visitors who have not bought anything: lead with the handbook. */
export function HandbookFirstCard() {
  return (
    <Card className="no-print flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">The handbook</p>
      <h2 className="font-display text-3xl leading-tight text-olive text-balance">
        Start with the handbook
      </h2>
      <p className="max-w-prose text-pretty text-ink">
        Seven short chapters on working from home: your workspace, household, phone, daily
        rituals, deep work, people and energy. One action per chapter. Online guide plus the
        PDF, {PRICE_LABEL}, pay once.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link to="/buy">Get the handbook ({PRICE_LABEL})</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/guide/$slug" params={{ slug: "intro" }}>
            <BookOpen className="size-4" /> Read Chapter 1 free
          </Link>
        </Button>
      </div>
      <div className="border-t border-yellow pt-4">
        <UnlockDeviceForm />
      </div>
    </Card>
  );
}

const ADDON_DISMISSED_KEY = "df-app-addon-dismissed";

/**
 * Home for handbook buyers (no app). No app pitch for the first 7 days after
 * the unlock; after that, one small dismissible add-on line.
 */
export function HandbookUnlockedCard() {
  const pitchAllowed = useAppPitchAllowed();
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(ADDON_DISMISSED_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(ADDON_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <Card className="no-print flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Handbook</p>
      <h2 className="font-display text-3xl leading-tight text-olive text-balance">
        Your handbook is unlocked
      </h2>
      <p className="max-w-prose text-pretty text-ink">
        Read one chapter at a time and do its action this week. Start with Chapter 1, then
        the chapter that names your biggest friction.
      </p>
      <div>
        <Button asChild>
          <Link to="/guide">
            <BookOpen className="size-4" /> Read the handbook
          </Link>
        </Button>
      </div>
      {pitchAllowed && !dismissed ? (
        <div className="flex items-start gap-2 rounded-md border border-yellow bg-paper p-3 text-sm text-ink">
          <p className="flex-1">
            Optional add-on: the Deep Focus app is a daily planner, focus bell, energy log and
            weekly planner in your browser, nothing to install. {APP_PRICE_LABEL}. {APP_ACCESS_LINE}{" "}
            <Link to="/app" className="font-semibold text-olive underline underline-offset-4">
              Have a look
            </Link>
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-cream"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </Card>
  );
}
