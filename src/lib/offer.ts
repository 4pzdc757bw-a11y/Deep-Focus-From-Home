export const PRICE = 17;
export const PRICE_LABEL = "$17";

/** Optional app upsell (one-time). Locked with handbook $17. */
export const APP_PRICE = 37;
export const APP_PRICE_LABEL = "$37";

export const OFFER_NAME = "Remote Workers Deep Focus";

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
