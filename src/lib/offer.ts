export const PRICE = 17;
export const PRICE_LABEL = "$17";

/** App offer (one-time). Separate from handbook $17. */
export const APP_PRICE = 37;
export const APP_PRICE_LABEL = "$37";

export const OFFER_NAME = "Remote Workers Deep Focus";

export type PurchaseProduct = "handbook" | "app";

/**
 * Stripe Payment Link URLs (public buy.stripe.com /… links — not secret keys).
 * Set via Vercel env when products exist; empty keeps /buy as a preview stub.
 *
 * Success URLs in Stripe Dashboard (recommended):
 *   Handbook → https://deepfocus.jeffsebiz.com/access?product=handbook
 *   App      → https://deepfocus.jeffsebiz.com/access?product=app
 */
function sanitizeStripePaymentLink(raw: string | undefined): string {
  const url = (raw ?? "").trim();
  if (!url) return "";
  // Never ship Stripe test-mode buy links on a production build.
  if (import.meta.env.PROD && /buy\.stripe\.com\/test_/i.test(url)) {
    console.error(
      "[Deep Focus] Refusing Stripe TEST payment link in production build:",
      url,
    );
    return "";
  }
  return url;
}

export const STRIPE_HANDBOOK_PAYMENT_LINK = sanitizeStripePaymentLink(
  import.meta.env.VITE_STRIPE_HANDBOOK_PAYMENT_LINK as string | undefined,
);

export const STRIPE_APP_PAYMENT_LINK = sanitizeStripePaymentLink(
  import.meta.env.VITE_STRIPE_APP_PAYMENT_LINK as string | undefined,
);

export const stripeCheckoutReady =
  Boolean(STRIPE_HANDBOOK_PAYMENT_LINK) || Boolean(STRIPE_APP_PAYMENT_LINK);

export function saveLeadEmail(email: string) {
  try {
    window.localStorage.setItem("deep-focus-lead-email", email.trim().toLowerCase());
  } catch {
    /* storage blocked */
  }
}

export function markPurchased(product?: PurchaseProduct) {
  try {
    window.localStorage.setItem("deep-focus-purchased", "1");
    if (product === "handbook" || product === "app") {
      window.localStorage.setItem("deep-focus-product", product);
    }
  } catch {
    /* storage blocked */
  }
}

export function getPurchasedProduct(): PurchaseProduct | null {
  try {
    const p = window.localStorage.getItem("deep-focus-product");
    if (p === "app" || p === "handbook") return p;
  } catch {
    /* storage blocked */
  }
  return null;
}

export function parsePurchaseProduct(raw: unknown): PurchaseProduct | undefined {
  if (raw === "app" || raw === "handbook") return raw;
  return undefined;
}
