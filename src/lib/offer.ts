export const PRICE = 17;
export const PRICE_LABEL = "$17";

/** Optional app upsell (one-time). Locked with handbook $17. */
export const APP_PRICE = 37;
export const APP_PRICE_LABEL = "$37";

export const OFFER_NAME = "Remote Workers Deep Focus";

/**
 * Stripe Payment Link URLs (public buy.stripe.com /… links — not secret keys).
 * Set via Vercel env when products exist; empty keeps /buy as a preview stub.
 */
export const STRIPE_HANDBOOK_PAYMENT_LINK = (
  import.meta.env.VITE_STRIPE_HANDBOOK_PAYMENT_LINK as string | undefined
)?.trim() ?? "";

export const STRIPE_APP_PAYMENT_LINK = (
  import.meta.env.VITE_STRIPE_APP_PAYMENT_LINK as string | undefined
)?.trim() ?? "";

export const stripeCheckoutReady =
  Boolean(STRIPE_HANDBOOK_PAYMENT_LINK) || Boolean(STRIPE_APP_PAYMENT_LINK);

export function saveLeadEmail(email: string) {
  try {
    window.localStorage.setItem("deep-focus-lead-email", email.trim().toLowerCase());
  } catch {
    /* storage blocked */
  }
}

export function markPurchased() {
  try {
    window.localStorage.setItem("deep-focus-purchased", "1");
  } catch {
    /* storage blocked */
  }
}
