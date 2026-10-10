import type Stripe from "stripe";

export type SessionProduct = "handbook" | "app";

/**
 * What a checkout bought. "upgrade" is the $20 app upgrade for handbook
 * buyers (#108): it only counts as the app when the same email also has a
 * paid, unrefunded handbook purchase (see combineSessionKinds and
 * upgradeHasHandbook in downloads/stripe.server.ts).
 */
export type SessionKind = SessionProduct | "upgrade";

type SessionLike = Pick<
  Stripe.Checkout.Session,
  "success_url" | "amount_subtotal" | "amount_total" | "currency"
>;

/** App and handbook list prices in cents (fallback when success URL lacks ?product=). */
const APP_CENTS = 3700;
const HANDBOOK_CENTS = 1700;

function successUrlInfo(raw: string | null | undefined): {
  ours: boolean;
  product: SessionKind | null;
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
      product:
        ours && (p === "app" || p === "handbook" || p === "upgrade") ? p : null,
    };
  } catch {
    return { ours: false, product: null };
  }
}

/**
 * Work out which Deep Focus product a paid Checkout Session bought.
 *
 * 0. The $20 app upgrade's success URL has ?product=upgrade → "upgrade".
 * 1. A $0 checkout that lands on this site is the beta-helper link → app.
 * 2. The Payment Link success URL's ?product=handbook|app (set by the owner in
 *    Stripe; buyers cannot change it).
 * 3. Fallback by price: $37+ → app, $17+ → handbook.
 *
 * strict=true (email lookup) ignores sessions whose success URL is not this
 * site's /access or /thanks, so other products on the same Stripe account are
 * never counted.
 */
export function sessionKind(
  session: SessionLike,
  { strict }: { strict: boolean },
): SessionKind | null {
  const info = successUrlInfo(session.success_url);
  if (strict && !info.ours) return null;

  const subtotal = session.amount_subtotal ?? session.amount_total ?? null;
  // The $20 upgrade is only ever "upgrade", never the app by itself.
  if (info.product === "upgrade") return subtotal === 0 ? null : "upgrade";
  if (subtotal === 0) return info.ours ? "app" : null;
  if (info.product) return info.product;

  const currency = (session.currency ?? "usd").toLowerCase();
  if (subtotal == null || currency !== "usd") return null;
  if (subtotal >= APP_CENTS) return "app";
  if (subtotal >= HANDBOOK_CENTS) return "handbook";
  return null;
}

/**
 * Product a single checkout unlocks on its own. The $20 upgrade returns null
 * here (fail closed): it needs the handbook purchase checked as well.
 */
export function productFromSession(
  session: SessionLike,
  opts: { strict: boolean },
): SessionProduct | null {
  const kind = sessionKind(session, opts);
  return kind === "upgrade" ? null : kind;
}

/**
 * Best access from one customer's paid, unrefunded checkouts (same email).
 * The upgrade only becomes the app next to a handbook purchase; if the
 * handbook was refunded, the upgrade price no longer applies (Terms §3).
 */
export function combineSessionKinds(
  kinds: Iterable<SessionKind | null | undefined>,
): SessionProduct | null {
  let app = false;
  let handbook = false;
  let upgrade = false;
  for (const k of kinds) {
    if (k === "app") app = true;
    else if (k === "handbook") handbook = true;
    else if (k === "upgrade") upgrade = true;
  }
  if (app || (upgrade && handbook)) return "app";
  if (handbook) return "handbook";
  return null;
}
