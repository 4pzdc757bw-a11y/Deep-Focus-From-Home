/** Vera-approved locked legal copy (Desktop JEFFSEBIZ/Legal + Offer-and-Policies). Do not invent. */

export const LEGAL_EFFECTIVE_DATE = "October 1, 2026";

/** Locked checkout / footer line from Store Credit policy. */
export const STORE_CREDIT_CHECKOUT_LINE =
  "Digital products, no automatic refunds. If something’s wrong, email jeffrey@jeffsebiz.com. We aim to reply within 3 business days, fix delivery problems, and refund duplicate charges. Other requests are reviewed case by case.";

/**
 * Fix-it rule (Vera): identical wording in the Store Credit Policy and Terms
 * section 8. Both pages render these constants, so they cannot drift apart.
 */
export const FIX_IT_HEADING = "Didn’t get your files, or charged twice?";
export const FIX_IT_INTRO =
  "Email jeffrey@jeffsebiz.com with the email you used to buy and your Stripe receipt (or the date and amount).";
export const FIX_IT_ITEMS = [
  "Files never arrived or won’t open: we’ll resend them or send a working download link.",
  "Charged more than once for the same order: we’ll refund the extra charge to your original payment method.",
] as const;
export const FIX_IT_REPLY =
  "These fixes are separate from store credit. They’re not case-by-case. We aim to reply within 3 business days (Monday to Friday, US Central time, excluding US holidays).";

export const LEGAL_LINKS = [
  { to: "/terms" as const, label: "Terms of Service" },
  { to: "/privacy" as const, label: "Privacy Policy" },
  { to: "/store-credit" as const, label: "Store Credit Policy" },
];
