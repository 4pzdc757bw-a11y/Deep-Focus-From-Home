import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import {
  APP_PRICE_LABEL,
  markPurchased,
  PRICE_LABEL,
} from "@/lib/offer";
import { STORE_CREDIT_CHECKOUT_LINE } from "@/lib/legal";
import { useFocusStore } from "@/lib/store";

export const Route = createFileRoute("/buy")({ component: BuyPage });

const HANDBOOK_INCLUDED = [
  "The handbook — Deep Focus from Home (phone and desktop PDF)",
  "Every fillable form — daily, energy, setup, weekly, household, monthly",
];

const APP_INCLUDED = [
  "The installable app — Daily OS, starter week, bell, energy peak, household fridge copy",
  "Same system as the book, on your phone — forms already filled in",
];

function BuyPage() {
  const navigate = useNavigate();
  const start = useFocusStore((s) => s.startStarter);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Handbook + fillables · {PRICE_LABEL}
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        Remote Workers Deep Focus
      </h1>
      <p className="max-w-prose text-lg text-ink">
        Not a course. Not a streak app. A practical handbook and the fillable
        worksheets so you can rebuild focus from home — then an optional app
        if you want the system on your phone.
      </p>

      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Core offer
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
        <Button
          type="button"
          onClick={() => {
            markPurchased();
            start();
            void navigate({ to: "/starter" });
          }}
        >
          Pay {PRICE_LABEL} — get the handbook
        </Button>
        <p className="text-sm text-muted">
          This preview unlocks access on this device. When you sell for real,
          this button becomes Stripe or Gumroad for the {PRICE_LABEL} handbook,
          then sends the same people here.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Optional upsell
        </p>
        <p className="font-display text-2xl text-olive">The app</p>
        <ul className="flex flex-col gap-2 text-ink">
          {APP_INCLUDED.map((item) => (
            <li key={item} className="border-l-2 border-yellow pl-3">
              {item}
            </li>
          ))}
        </ul>
        <p className="text-3xl font-display text-olive">{APP_PRICE_LABEL}</p>
        <p className="text-sm text-muted">One-time. After the handbook, if you want it.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            markPurchased();
            start();
            void navigate({ to: "/starter" });
          }}
        >
          Pay {APP_PRICE_LABEL} — unlock the app
        </Button>
        <p className="text-sm text-muted">
          Preview stub only. Live checkout will use Stripe or Gumroad for the{" "}
          {APP_PRICE_LABEL} app SKU — separate from the handbook.
        </p>
      </Card>

      <p className="text-sm text-muted">
        Not ready?{" "}
        <Link to="/thanks" className="font-semibold text-olive">
          Go back to the free pack
        </Link>
        .
      </p>

      <p className="text-sm text-muted">{STORE_CREDIT_CHECKOUT_LINE}</p>
      <LegalFooter />
    </div>
  );
}
