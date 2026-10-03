import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import { NotReadyLinks } from "@/components/not-ready";
import {
  APP_PRICE_LABEL,
  markPurchased,
  PRICE_LABEL,
  STRIPE_APP_PAYMENT_LINK,
  STRIPE_HANDBOOK_PAYMENT_LINK,
} from "@/lib/offer";
import { STORE_CREDIT_CHECKOUT_LINE } from "@/lib/legal";
import { useFocusStore } from "@/lib/store";

export const Route = createFileRoute("/buy")({ component: BuyPage });

const HANDBOOK_INCLUDED = [
  "The handbook — Deep Focus from Home (phone and desktop PDF)",
  "Every fillable form — daily, energy, setup, weekly, household, monthly",
];

const APP_INCLUDED = [
  "The browser-based app — Daily OS, focus bell, energy peak, weekly planner, household fridge copy",
  "Same system as the book, in your phone or computer browser — forms already filled in",
  "Includes handbook PDFs and fillables",
];

function BuyPage() {
  const navigate = useNavigate();
  const start = useFocusStore((s) => s.startStarter);
  const handbookCheckout = STRIPE_HANDBOOK_PAYMENT_LINK;
  const appCheckout = STRIPE_APP_PAYMENT_LINK;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Two clear offers · pay once
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        Remote Workers Deep Focus
      </h1>
      <p className="max-w-prose text-lg text-ink">
        Not a course. Not a streak app. Start with the handbook. The Deep
        Focus app is a separate, optional add-on.
      </p>

      <Card className="flex flex-col gap-3 border-2 border-olive">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Start here · Handbook
        </p>
        <p className="font-display text-2xl text-olive">Handbook + fillables</p>
        <ul className="flex flex-col gap-2 text-ink">
          {HANDBOOK_INCLUDED.map((item) => (
            <li key={item} className="border-l-2 border-yellow pl-3">
              {item}
            </li>
          ))}
        </ul>
        <p className="text-3xl font-display text-olive">{PRICE_LABEL}</p>
        <p className="text-sm text-muted">Pay once. No subscription.</p>
        {handbookCheckout ? (
          <Button asChild>
            <a href={handbookCheckout} rel="noopener noreferrer">
              Get the handbook — {PRICE_LABEL}
            </a>
          </Button>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => {
                markPurchased("handbook");
                start();
                void navigate({ to: "/thanks", search: { paid: 1, product: "handbook" } });
              }}
            >
              Get the handbook — {PRICE_LABEL}
            </Button>
            <p className="text-sm text-muted">
              Preview unlock on this device. Live Stripe Payment Link is not
              configured yet (set VITE_STRIPE_HANDBOOK_PAYMENT_LINK).
            </p>
          </>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          The app
        </p>
        <p className="font-display text-2xl text-olive">Run it in your browser</p>
        <p className="text-ink">
          The Deep Focus app: an optional add-on to the handbook — a daily planner, focus
          bell, energy log and weekly planner in your browser. {APP_PRICE_LABEL}, pay once.
        </p>
        <ul className="flex flex-col gap-2 text-ink">
          {APP_INCLUDED.map((item) => (
            <li key={item} className="border-l-2 border-yellow pl-3">
              {item}
            </li>
          ))}
        </ul>
        <p className="text-3xl font-display text-olive">{APP_PRICE_LABEL}</p>
        <p className="text-sm text-muted">One-time. Full system in the app.</p>
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

      <NotReadyLinks />

      <p className="text-sm text-muted">{STORE_CREDIT_CHECKOUT_LINE}</p>
      <LegalFooter />
    </div>
  );
}
