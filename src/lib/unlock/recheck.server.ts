import type Stripe from "stripe";
import {
  checkoutSessionGrantsAccess,
  CHECKOUT_SESSION_REFUND_EXPAND,
  grantingSessionsForEmail,
  isPaidCheckoutSession,
  paymentIntentRefundStatus,
  sessionEmail,
  upgradeHasHandbook,
  type CheckoutSessionsApi,
} from "../downloads/stripe.server.ts";
import { hasAccess, type UnlockProduct } from "./access.ts";
import {
  combineSessionKinds,
  pickBackingSession,
  sessionKind,
} from "./product.server.ts";
import type { UnlockTokenPayload } from "./token.server.ts";

/**
 * Refund recheck for devices that are already unlocked (Terms §8: a refund
 * ends access). The unlock cookie records which Stripe checkout backs it;
 * at most once a day the server looks at that purchase again.
 *
 * Rules:
 * - Only a positive "fully refunded" answer from Stripe removes access.
 *   Any Stripe error or slowness keeps access (fail open) and retries soon.
 * - A fully refunded duplicate does not cut off someone who has another
 *   paid, unrefunded purchase that covers the product.
 * - Cookies minted before this feature have no backing purchase; they are
 *   left alone until the buyer unlocks again.
 */

/** How long a good answer is trusted before the next recheck. */
export const RECHECK_INTERVAL_SECONDS = 24 * 60 * 60;
/** After Stripe errors or is slow, try again after this long. */
export const RECHECK_RETRY_SECONDS = 60 * 60;
/** Longest the page waits on Stripe for the recheck. */
export const RECHECK_TIMEOUT_MS = 2500;

export type RecheckOutcome =
  /** Nothing to do (legacy cookie, or not due yet). Cookie stays as is. */
  | { action: "skip" }
  /** Still valid: rewrite the cookie with the new next-check time (and backing purchase). */
  | { action: "renew"; product: UnlockProduct; sessionId: string; nextCheck: number }
  /** Still some access, but less than before (e.g. the $20 upgrade was refunded, handbook remains). */
  | { action: "downgrade"; product: UnlockProduct; sessionId: string; nextCheck: number }
  /** Fully refunded and nothing else valid: clear the cookie. */
  | { action: "revoke" }
  /** Stripe failed or was slow: keep access, retry later. */
  | { action: "keep"; nextCheck: number };

class RecheckTimeout extends Error {
  constructor() {
    super("Stripe refund recheck timed out");
  }
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RecheckTimeout()), ms);
  });
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** True when this cookie names a purchase and its recheck is due. */
export function recheckDue(
  token: Pick<UnlockTokenPayload, "s" | "n">,
  nowSeconds: number,
): boolean {
  if (!token.s) return false; // old cookie: no purchase info, keep working
  return typeof token.n !== "number" || token.n <= nowSeconds;
}

async function evaluate(
  token: UnlockTokenPayload & { s: string },
  stripe: CheckoutSessionsApi,
  nowSeconds: number,
): Promise<RecheckOutcome> {
  const nextCheck = nowSeconds + RECHECK_INTERVAL_SECONDS;
  const session: Stripe.Checkout.Session = await stripe.checkout.sessions.retrieve(
    token.s,
    { expand: [...CHECKOUT_SESSION_REFUND_EXPAND] },
  );

  // Not paid at all / unexpected shape: not a refund, so do not lock anyone out.
  if (!isPaidCheckoutSession(session)) return { action: "keep", nextCheck: nowSeconds + RECHECK_RETRY_SECONDS };

  const fullyRefunded =
    !checkoutSessionGrantsAccess(session) &&
    paymentIntentRefundStatus(session.payment_intent) === "fully_refunded";

  let backingOk = !fullyRefunded;
  if (backingOk && sessionKind(session, { strict: false }) === "upgrade") {
    // The $20 upgrade only counts next to a paid, unrefunded handbook.
    backingOk = await upgradeHasHandbook(stripe, session);
  }
  if (backingOk) {
    return { action: "renew", product: token.p, sessionId: session.id, nextCheck };
  }

  // This purchase no longer counts. Does the same buyer have another that does?
  const email = sessionEmail(session);
  const others = email
    ? await grantingSessionsForEmail(stripe, email, { excludeId: session.id })
    : [];
  const best = combineSessionKinds(others.map((o) => o.kind));
  if (!best) return { action: "revoke" };
  const backing = pickBackingSession(others, best);
  if (!backing) return { action: "revoke" };
  return hasAccess(best, token.p)
    ? { action: "renew", product: token.p, sessionId: backing.session.id, nextCheck }
    : { action: "downgrade", product: best, sessionId: backing.session.id, nextCheck };
}

/**
 * Decide what to do with an unlock cookie. Never throws: any failure keeps
 * access. Pass `stripe` as a lazy factory so no Stripe client is built (and
 * no key is needed) when the recheck is not due.
 */
export async function recheckUnlock(
  token: UnlockTokenPayload,
  deps: {
    stripe: () => CheckoutSessionsApi;
    nowSeconds?: number;
    timeoutMs?: number;
  },
): Promise<RecheckOutcome> {
  const now = deps.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!token.s || !recheckDue(token, now)) return { action: "skip" };
  try {
    return await withTimeout(
      evaluate({ ...token, s: token.s }, deps.stripe(), now),
      deps.timeoutMs ?? RECHECK_TIMEOUT_MS,
    );
  } catch (err) {
    console.error(
      "[unlock] refund recheck failed, keeping access:",
      err instanceof Error ? err.message : err,
    );
    return { action: "keep", nextCheck: now + RECHECK_RETRY_SECONDS };
  }
}
