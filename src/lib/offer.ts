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

export function markPurchased() {
  try {
    window.localStorage.setItem("deep-focus-purchased", "1");
  } catch {
    /* storage blocked */
  }
}
