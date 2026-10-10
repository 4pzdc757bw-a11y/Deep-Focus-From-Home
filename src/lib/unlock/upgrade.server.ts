/**
 * #108: the $20 "App upgrade for handbook buyers" Stripe Payment Link.
 *
 * Kept on the server (not a VITE_* var) so it is never in the page code:
 * startAppUpgrade only hands it to a device with the handbook unlocked, for
 * an email with a paid, unrefunded handbook purchase, with that email locked
 * in checkout. Even if the link leaks, paying it without a valid handbook on
 * the same email does not open the app (assertPaidCheckoutSession /
 * combineSessionKinds check again after payment).
 *
 * Success URL set on the link in Stripe:
 *   https://deepfocusfromhome.com/thanks?paid=1&product=upgrade&session_id={CHECKOUT_SESSION_ID}
 */
/** Live link, created Oct 8 2026 (plink_1UOTtI0gtxHiL6EKcyZZ5nZ8, price_1UOTr10gtxHiL6EKuNDYBeK2). */
export const APP_UPGRADE_PAYMENT_LINK_DEFAULT =
  "https://buy.stripe.com/14A28j9gBf431Sk8zagUM03";

export function appUpgradePaymentLink(): string {
  const url = (
    process.env.STRIPE_APP_UPGRADE_PAYMENT_LINK ??
    APP_UPGRADE_PAYMENT_LINK_DEFAULT
  ).trim();
  if (!/^https:\/\/buy\.stripe\.com\//.test(url)) return "";
  // Never hand out a Stripe test-mode link on production.
  if (
    process.env.NODE_ENV === "production" &&
    /buy\.stripe\.com\/test_/i.test(url)
  ) {
    return "";
  }
  return url;
}

/** Checkout URL with the handbook buyer's email locked (not editable). */
export function appUpgradeCheckoutUrl(
  { email, handbookSessionId }: { email: string; handbookSessionId: string },
  link: string = appUpgradePaymentLink(),
): string {
  if (!link) return "";
  const url = new URL(link);
  url.searchParams.set("locked_prefilled_email", email);
  // Stripe allows letters, digits, dashes and underscores (max 200).
  if (/^[A-Za-z0-9_-]{1,200}$/.test(handbookSessionId)) {
    url.searchParams.set("client_reference_id", handbookSessionId);
  }
  return url.toString();
}
