import type Stripe from "stripe";

export type SessionProduct = "handbook" | "app";

type SessionLike = Pick<
  Stripe.Checkout.Session,
  "success_url" | "amount_subtotal" | "amount_total" | "currency"
>;

/** App and handbook list prices in cents (fallback when success URL lacks ?product=). */
const APP_CENTS = 3700;
const HANDBOOK_CENTS = 1700;

function successUrlInfo(raw: string | null | undefined): {
  ours: boolean;
  product: SessionProduct | null;
} {
  if (!raw) return { ours: false, product: null };
  try {
    // Stripe keeps the literal {CHECKOUT_SESSION_ID} placeholder here.
    const url = new URL(raw);
    const path = url.pathname.replace(/\/+$/, "");
    const ours = path === "/access" || path === "/thanks";
    const p = url.searchParams.get("product");
    return {
      ours,
      product: ours && (p === "app" || p === "handbook") ? p : null,
    };
  } catch {
    return { ours: false, product: null };
  }
}

/**
 * Work out which Deep Focus product a paid Checkout Session bought.
 *
 * 1. A $0 checkout that lands on this site is the beta-helper link → app.
 * 2. The Payment Link success URL's ?product=handbook|app (set by the owner in
 *    Stripe; buyers cannot change it).
 * 3. Fallback by price: $37+ → app, $17+ → handbook.
 *
 * strict=true (email lookup) ignores sessions whose success URL is not this
 * site's /access or /thanks, so other products on the same Stripe account are
 * never counted.
 */
export function productFromSession(
  session: SessionLike,
  { strict }: { strict: boolean },
): SessionProduct | null {
  const info = successUrlInfo(session.success_url);
  if (strict && !info.ours) return null;

  const subtotal = session.amount_subtotal ?? session.amount_total ?? null;
  if (subtotal === 0) return info.ours ? "app" : null;
  if (info.product) return info.product;

  const currency = (session.currency ?? "usd").toLowerCase();
  if (subtotal == null || currency !== "usd") return null;
  if (subtotal >= APP_CENTS) return "app";
  if (subtotal >= HANDBOOK_CENTS) return "handbook";
  return null;
}
