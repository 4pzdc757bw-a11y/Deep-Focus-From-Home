import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import { PreviewAppButton } from "@/components/app-preview-button";
import {
  APP_ACCESS_LINE,
  APP_PRICE_LABEL,
  markPurchased,
  STRIPE_APP_PAYMENT_LINK,
} from "@/lib/offer";
import { STORE_CREDIT_CHECKOUT_LINE } from "@/lib/legal";
import { useFocusStore } from "@/lib/store";

/**
 * The $37 app offer. Deliberately unlinked: nothing in the nav, footer, home,
 * guide or /buy points here. Only the Day 5 and Day 7 emails (and existing
 * handbook-buyer upgrade spots) link to it. Kept out of search engines.
 */
export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "The Deep Focus app · Deep Focus from Home" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AppOfferPage,
});

const APP_INCLUDED = [
  "The browser-based web app — Daily OS, focus bell, energy peak, weekly planner, household fridge copy",
  "Same system as the book, in your phone or computer browser — nothing to download or install",
  "Includes handbook PDFs and fillables",
];

function AppOfferPage() {
  const navigate = useNavigate();
  const start = useFocusStore((s) => s.startStarter);
  const appCheckout = STRIPE_APP_PAYMENT_LINK;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Optional add-on · pay once
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        The Deep Focus app
      </h1>
      <p className="max-w-prose text-lg text-ink">
        The handbook&apos;s system, built into your browser: plan the day, ring the
        focus bell, log your energy and plan the week.
      </p>

      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          The app
        </p>
        <p className="font-display text-2xl text-olive">Run it in your browser</p>
        <p className="text-ink">
          The Deep Focus app: an optional add-on to the handbook — a daily planner, focus
          bell, energy log and weekly planner that runs in your web browser. There is
          nothing to download or install.
        </p>
        <ul className="flex flex-col gap-2 text-ink">
          {APP_INCLUDED.map((item) => (
            <li key={item} className="border-l-2 border-yellow pl-3">
              {item}
            </li>
          ))}
        </ul>
        <div className="rounded-md border border-yellow bg-paper p-3 text-sm text-ink">
          <p className="font-semibold text-olive">What the app adds</p>
          <p className="mt-1">
            The app adds the interactive tools, which are locked unless you
            buy the app: the daily planner (Daily OS with the focus bell and
            Close day), the energy log, home focus setup, the weekly planner,
            the monthly review and the household agreement. Your entries are
            filled in and saved in your browser, and you can print or save any
            day as a PDF. It also includes everything in the handbook.
          </p>
        </div>
        <p className="text-3xl font-display text-olive">{APP_PRICE_LABEL}</p>
        <p className="text-sm text-muted">{APP_ACCESS_LINE}</p>
        <PreviewAppButton />
        {appCheckout ? (
          <Button variant="outline" asChild>
            <a href={appCheckout} rel="noopener noreferrer">
              Get the app — {APP_PRICE_LABEL}
            </a>
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                markPurchased("app");
                start();
                void navigate({ to: "/thanks", search: { paid: 1, product: "app" } });
              }}
            >
              Get the app — {APP_PRICE_LABEL}
            </Button>
            <p className="text-sm text-muted">
              Preview stub only. Live Stripe Payment Link is not configured yet
              (set VITE_STRIPE_APP_PAYMENT_LINK).
            </p>
          </>
        )}
      </Card>


      <p className="text-sm text-muted">
        Only want the book?{" "}
        <Link to="/buy" className="font-semibold text-olive underline underline-offset-4">
          The handbook is on the buy page
        </Link>
        .
      </p>
      <p className="text-sm text-muted">{STORE_CREDIT_CHECKOUT_LINE}</p>
      <LegalFooter />
    </div>
  );
}
