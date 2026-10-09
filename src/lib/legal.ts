/** Vera-approved locked legal copy (Desktop JEFFSEBIZ/Legal + Offer-and-Policies). Do not invent. */

export const LEGAL_EFFECTIVE_DATE = "October 8, 2026";

/** Official business mailing address (MailPro mailbox #210). Never the home address. */
export const BUSINESS_NAME = "JEFFSEBIZ LLC";
export const BUSINESS_ADDRESS_LINES = ["333 W Bethalto Dr, Ste C #210", "Bethalto, IL 62010"] as const;
export const BUSINESS_ADDRESS = BUSINESS_ADDRESS_LINES.join(", ");
export const BUSINESS_EMAIL = "support@deepfocusfromhome.com";

/** Vera-confirmed (#65): no-sale countries. Same line on /buy and Terms. */
export const NO_SALE_COUNTRIES_LINE =
  "We currently don’t sell to customers in the European Union, the United Kingdom, Norway, Iceland, Liechtenstein, Switzerland, or the Isle of Man.";

/** Locked checkout / footer line from Store Credit policy. */
export const STORE_CREDIT_CHECKOUT_LINE =
  "Digital products, no automatic refunds. If something’s wrong, email support@deepfocusfromhome.com. We aim to reply within 3 business days, fix delivery problems, and refund duplicate charges. Other requests are reviewed case by case.";

/**
 * Fix-it rule (Vera): identical wording in the Store Credit Policy and Terms
 * section 8. Both pages render these constants, so they cannot drift apart.
 */
export const FIX_IT_HEADING = "Didn’t get your files, or charged twice?";
export const FIX_IT_INTRO =
  "Email support@deepfocusfromhome.com with the email you used to buy and your Stripe receipt (or the date and amount).";
export const FIX_IT_ITEMS = [
  "Files never arrived or won’t open: we’ll resend them or send a working download link.",
  "Charged more than once for the same order: we’ll refund the extra charge to your original payment method.",
] as const;
export const FIX_IT_REPLY =
  "These fixes are separate from store credit. They’re not case-by-case. We aim to reply within 3 business days (Monday to Friday, US Central time, excluding US holidays).";

/**
 * Store credit limits (Vera, Oct 3). Same wording on the Store Credit page
 * (as a list) and in Terms section 8 (as one sentence).
 */
export const STORE_CREDIT_LIMIT_ITEMS = [
  "Credit covers the purchase price only, not any tax you paid.",
  "Credit has no cash value and can’t be cashed out.",
  "Credit isn’t a gift card and can’t be transferred to anyone else.",
] as const;
export const STORE_CREDIT_LIMITS =
  "Store credit covers the purchase price only, not any tax you paid. It has no cash value, isn’t a gift card, and can’t be transferred to anyone else.";

/** Refund or credit ends access (Terms section 8). */
export const REFUND_ENDS_ACCESS =
  "A refund or store credit for a purchase ends your access to that purchase. (Refunding a duplicate charge doesn’t affect your access.)";

/** Payment problems (Terms section 7). Neutral; internal refund rules stay internal. */
export const PAYMENT_DISPUTE_LINE =
  "If there’s a problem with a charge, please email us first at support@deepfocusfromhome.com so we can fix it quickly. Access to the purchase may be paused while a payment dispute is open.";

/** Consumer rights the law doesn't let us waive (Terms section 11). */
export const CONSUMER_RIGHTS_LINE =
  "Nothing in these Terms limits any consumer rights that the law doesn’t allow us to waive.";

/** App discontinuation (Terms section 3). */
export const DISCONTINUE_NOTICE =
  "If we decide to discontinue the app, we’ll give at least 30 days’ notice by email. Anyone who bought the app within the 12 months before that notice can ask for store credit under section 8, and we’ll provide it. Store credit issued because we discontinued the app is good for 12 months from the date we issue it.";

export const LEGAL_LINKS = [
  { to: "/terms" as const, label: "Terms of Service" },
  { to: "/privacy" as const, label: "Privacy Policy" },
  { to: "/store-credit" as const, label: "Store Credit Policy" },
];

/**
 * #108 Terms §3 upgrade line. Exact wording approved by Jeffrey, Vera and
 * Penny on Oct 8 2026. Keep "(currently $20)" in step with APP_PRICE - PRICE.
 */
export const TERMS_UPGRADE_LINE =
  "If you bought the handbook, you can upgrade to the app for the app price minus what you paid for the handbook (currently $20). The upgrade is only for the account or email that bought the handbook. If the handbook purchase is refunded, the upgrade price no longer applies. Refunding the upgrade refunds only the upgrade price.";
