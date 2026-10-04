import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import { NotReadyLinks } from "@/components/not-ready";
import {
  markPurchased,
  PRICE_LABEL,
  STRIPE_HANDBOOK_PAYMENT_LINK,
} from "@/lib/offer";
import { STORE_CREDIT_CHECKOUT_LINE } from "@/lib/legal";
import { useFocusStore } from "@/lib/store";

export const Route = createFileRoute("/buy")({ component: BuyPage });

const HANDBOOK_INCLUDED = [
  "The handbook — Deep Focus from Home (phone and desktop PDF)",
  "Every fillable form — daily, energy, setup, weekly, household, monthly",
];

function BuyPage() {
  const navigate = useNavigate();
  const start = useFocusStore((s) => s.startStarter);
  const handbookCheckout = STRIPE_HANDBOOK_PAYMENT_LINK;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        The handbook · pay once
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        Deep Focus from Home
      </h1>
      <p className="max-w-prose text-lg text-ink">
        Not a course. Not a subscription. Seven short chapters on working from
        home, one action each, plus the forms to use them.
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

      <NotReadyLinks />

      <p className="text-sm text-muted">{STORE_CREDIT_CHECKOUT_LINE}</p>
      <LegalFooter />
    </div>
  );
}
