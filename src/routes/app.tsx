import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import {
  APP_ACCESS_LINE,
  APP_PRICE_LABEL,
  APP_SAVE_NOTE,
  markPurchased,
  STRIPE_APP_PAYMENT_LINK,
} from "@/lib/offer";
import { STORE_CREDIT_CHECKOUT_LINE } from "@/lib/legal";
import { useFocusStore } from "@/lib/store";
import { AppUpgradeOffer } from "@/components/app-upgrade";
import { PreviewAppButton } from "@/components/app-preview-button";
import { useUnlockedProduct } from "@/components/lock-screen";

/**
 * The $37 app offer. Not in the nav, footer or guide. Reached from /buy ("See
 * the app, $37", the bio link lands there), the Day 5 and Day 7 emails and the
 * handbook-buyer upgrade spots. Kept out of search engines.
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
  "Includes the handbook: every chapter, the PDFs and the fillables",
];

function AppOfferPage() {
  const navigate = useNavigate();
  const start = useFocusStore((s) => s.startStarter);
  const appCheckout = STRIPE_APP_PAYMENT_LINK;
  const product = useUnlockedProduct();
  // #108: a device with the handbook unlocked sees the $20 upgrade, not $37.
  const handbookBuyer = product === "handbook";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        The app · includes the handbook · pay once
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        The Deep Focus app
      </h1>
      <p className="max-w-prose text-lg text-ink">
        The handbook&apos;s system, built into your browser: plan the day, ring
        the focus bell, log your energy and plan the week.
      </p>

      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          The app
        </p>
        <p className="font-display text-2xl text-olive">
          Run it in your browser
        </p>
        <p className="text-ink">
          The Deep Focus app: a daily planner, focus bell, energy log and weekly
          planner that runs in your phone or computer browser, and it includes
          the handbook. There is nothing to download or install.
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
            The app adds the interactive tools, which are locked unless you buy
            the app: the daily planner (Daily OS with the focus bell and Close
            day), the energy log, home focus setup, the weekly planner, the
            monthly review and the household agreement. Your entries are filled
            in and saved in your browser, and you can print or save any day as a
            PDF. It also includes everything in the handbook.
          </p>
        </div>
        {product === "app" ? null : (
          <p
            className="rounded-md border border-yellow bg-paper p-3 text-sm text-ink"
            data-testid="app-save-note"
          >
            {APP_SAVE_NOTE}
          </p>
        )}
        {handbookBuyer ? (
          <>
            <PreviewAppButton variant="outline" />
            <AppUpgradeOffer />
          </>
        ) : product === "app" ? (
          <Button asChild>
            <Link to="/">The app is open on this device. Go to Today</Link>
          </Button>
        ) : (
          <>
            <p className="text-3xl font-display text-olive">
              {APP_PRICE_LABEL}
            </p>
            <p className="text-sm text-muted">{APP_ACCESS_LINE}</p>
            <PreviewAppButton variant="outline" />
            {appCheckout ? (
              <Button asChild>
                <a href={appCheckout} rel="noopener noreferrer">
                  Get the app — {APP_PRICE_LABEL}
                </a>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    markPurchased("app");
                    start();
                    void navigate({
                      to: "/thanks",
                      search: { paid: 1, product: "app" },
                    });
                  }}
                >
                  Get the app — {APP_PRICE_LABEL}
                </Button>
                <p className="text-sm text-muted">
                  Preview stub only. Live Stripe Payment Link is not configured
                  yet (set VITE_STRIPE_APP_PAYMENT_LINK).
                </p>
              </>
            )}
          </>
        )}
      </Card>

      {handbookBuyer || product === "app" ? null : (
        <p className="text-sm text-muted">
          Only want the book?{" "}
          <Link
            to="/buy"
            className="font-semibold text-olive underline underline-offset-4"
          >
            The handbook is on the buy page
          </Link>
          .
        </p>
      )}
      <p className="text-sm text-muted">{STORE_CREDIT_CHECKOUT_LINE}</p>
      <LegalFooter />
    </div>
  );
}
