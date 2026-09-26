import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import { useEffect } from "react";
import { Card } from "@/components/app-shell";
import { LegalFooter } from "@/components/legal-footer";
import { Button } from "@/components/ui/button";
import { APP_PRICE_LABEL, markPurchased, PRICE_LABEL } from "@/lib/offer";
import { useFocusStore } from "@/lib/store";

type ThanksSearch = {
  /** Raw search value — TanStack JSON-parses `?paid=1` as number 1. */
  paid?: string | number | boolean;
};

/**
 * Keep the original parsed value so validateSearch does not rewrite search
 * (rewrite → server 307 that previously stripped unlock when paid was number 1).
 */
function keepPaidParam(raw: unknown): ThanksSearch {
  if (raw === undefined || raw === null || raw === "") return {};
  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  ) {
    return { paid: raw };
  }
  return {};
}

function isPaidUnlock(paid: ThanksSearch["paid"]): boolean {
  return paid === 1 || paid === "1" || paid === true || paid === "true";
}

export const Route = createFileRoute("/thanks")({
  validateSearch: (search: Record<string, unknown>): ThanksSearch =>
    keepPaidParam(search.paid),
  component: ThanksPage,
});

const HANDBOOK_DOWNLOADS = [
  {
    href: "/downloads/handbook/Deep_Focus_from_Home.pdf",
    label: "Download handbook (desktop PDF)",
  },
  {
    href: "/downloads/handbook/Deep_Focus_from_Home_Mobile.pdf",
    label: "Download handbook (phone PDF)",
  },
  {
    href: "/downloads/handbook/Fillables.zip",
    label: "Download fillable worksheets (ZIP)",
  },
] as const;

function ThanksPage() {
  const { paid } = Route.useSearch();
  const start = useFocusStore((s) => s.startStarter);
  const fromCheckout = isPaidUnlock(paid);

  useEffect(() => {
    if (!fromCheckout) return;
    markPurchased();
    start();
  }, [fromCheckout, start]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        {fromCheckout ? "Payment received — start Day 1" : "You’re in — start Day 1"}
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        {fromCheckout ? "Thank you — you’re in." : "The pack is yours."}
      </h1>
      <p className="max-w-prose text-lg text-ink">
        {fromCheckout
          ? "Your handbook and fillables are ready below. Do only Day 1 today: claim one work-only surface and park the phone for the first deep-work block."
          : "Do only Day 1 today: claim one work-only surface and park the phone for the first deep-work block (use the app to start, then phone off the desk). That is the whole job."}
      </p>

      {fromCheckout && (
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Your handbook access
          </p>
          <h2 className="font-display text-2xl text-olive">
            Download Deep Focus from Home
          </h2>
          <p className="text-ink">
            Phone PDF, desktop PDF, and every fillable worksheet. Keep the Stripe
            receipt email — that is your proof of purchase.
          </p>
          <div className="flex flex-col gap-2">
            {HANDBOOK_DOWNLOADS.map((item) => (
              <Button key={item.href} variant="outline" asChild>
                <a href={item.href} download>
                  <Download className="size-4" /> {item.label}
                </a>
              </Button>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link to="/starter" onClick={() => start()}>
            Open Day 1 in the app <ArrowRight className="size-4" />
          </Link>
        </Button>
        {!fromCheckout && (
          <Button variant="outline" asChild>
            <a href="/downloads/7-day-starter-pack.pdf" download>
              Download the PDF backup
            </a>
          </Button>
        )}
      </div>
      <p className="text-sm text-muted">
        {fromCheckout
          ? "Purchase unlock is marked on this device. Optional next: install the app from Day 1 if you want the system on your phone."
          : "The free pack is week one. The PDF is if you want it on paper."}
      </p>

      {!fromCheckout && (
        <>
          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              If you want the handbook
            </p>
            <h2 className="font-display text-2xl text-olive">
              Handbook + fillables. {PRICE_LABEL}.
            </h2>
            <p className="text-ink">
              The pack is week one. The full handbook and every fillable form —
              daily OS, energy log, setup, weekly planner, household agreement,
              monthly review — are {PRICE_LABEL}, pay once.
            </p>
            <div>
              <Button asChild>
                <Link to="/buy">Get the {PRICE_LABEL} handbook</Link>
              </Button>
            </div>
            <p className="text-sm text-muted">No webinar. Keep it if Day 1 already helped.</p>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Optional — the app
            </p>
            <h2 className="font-display text-2xl text-olive">
              Run it on your phone. {APP_PRICE_LABEL}.
            </h2>
            <p className="text-ink">
              Separate from the handbook: the installable app (Daily OS, starter
              week, bell, energy peak, household fridge copy). One-time{" "}
              {APP_PRICE_LABEL} upsell — only if you want it.
            </p>
            <div>
              <Button variant="outline" asChild>
                <Link to="/buy">See the {APP_PRICE_LABEL} app</Link>
              </Button>
            </div>
          </Card>
        </>
      )}
      <LegalFooter />
    </div>
  );
}
