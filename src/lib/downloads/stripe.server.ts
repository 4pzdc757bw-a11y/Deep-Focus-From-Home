import Stripe from "stripe";
import {
  DownloadAuthError,
  DownloadConfigError,
} from "./errors.ts";
import { hasAccess } from "../unlock/access.ts";
import {
  combineSessionKinds,
  sessionKind,
  type SessionKind,
} from "../unlock/product.server.ts";

/**
 * Restricted Stripe secret key with Checkout Sessions: Read is enough for
 * session lookup. Refund checks need PaymentIntents: Read (and expanded
 * latest_charge) so we can see amount_refunded. Never expose to the client;
 * never commit a real key.
 */
export function getStripeSecretKey(): string {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) {
    throw new DownloadConfigError(
      "STRIPE_SECRET_KEY is not set. Paid downloads stay locked until a restricted Stripe secret key is added in Vercel env.",
    );
  }
  if (!key.startsWith("sk_") && !key.startsWith("rk_")) {
    throw new DownloadConfigError(
      "STRIPE_SECRET_KEY does not look like a Stripe secret or restricted key (expected sk_… or rk_…).",
    );
  }
  return key;
}

export function stripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

/** Expand PaymentIntent + latest Charge so we can see full refunds. */
export const CHECKOUT_SESSION_REFUND_EXPAND = [
  "payment_intent.latest_charge",
] as const;

/** List expand path (Stripe list uses `data.` prefix). */
export const CHECKOUT_SESSION_LIST_REFUND_EXPAND = [
  "data.payment_intent.latest_charge",
] as const;

/** Paid, or a completed $0 checkout (beta-helper link). */
export function isPaidCheckoutSession(session: {
  payment_status?: string | null;
  status?: string | null;
}): boolean {
  const paymentStatus = session.payment_status ?? "";
  const status = session.status ?? "";
  return (
    paymentStatus === "paid" ||
    paymentStatus === "no_payment_required" ||
    status === "complete"
  );
}

export type PaymentRefundProbe = "not_refunded" | "fully_refunded" | "unknown";

/** Fields we read from an expanded Charge for refund detection. */
export type ChargeRefundFields = {
  amount: number;
  amount_refunded: number;
  refunded: boolean;
};

/** Fields we read from an expanded PaymentIntent for refund detection. */
export type PaymentIntentRefundFields = {
  amount: number;
  latest_charge: string | ChargeRefundFields | null;
};

/**
 * Inspect an expanded PaymentIntent (and its latest Charge) for a full refund.
 * Partial refunds do not end access (amount_refunded < amount).
 * Unexpanded ids / missing charge → "unknown" (callers fail closed).
 */
export function paymentIntentRefundStatus(
  paymentIntent: string | PaymentIntentRefundFields | null | undefined,
): PaymentRefundProbe {
  if (paymentIntent == null) return "not_refunded";
  if (typeof paymentIntent === "string") return "unknown";

  const charge = paymentIntent.latest_charge;
  if (charge == null) {
    // $0 / no capture — nothing to refund.
    if ((paymentIntent.amount ?? 0) === 0) return "not_refunded";
    return "unknown";
  }
  if (typeof charge === "string") return "unknown";

  const amount = charge.amount ?? paymentIntent.amount ?? 0;
  const amountRefunded = charge.amount_refunded ?? 0;
  if (charge.refunded === true || (amount > 0 && amountRefunded >= amount)) {
    return "fully_refunded";
  }
  return "not_refunded";
}

/** Session fields needed to decide unlock/download access. */
export type CheckoutAccessSession = {
  payment_status?: string | null;
  status?: string | null;
  payment_intent?: string | PaymentIntentRefundFields | null;
  amount_total?: number | null;
};

/**
 * Whether this Checkout Session still unlocks the product.
 * Fail closed when a paid session's PaymentIntent/charge was not expanded
 * (restricted key missing PaymentIntents: Read, or expand ignored).
 */
export function checkoutSessionGrantsAccess(
  session: CheckoutAccessSession,
): boolean {
  if (!isPaidCheckoutSession(session)) return false;
  // Free / beta-helper checkouts have no refundable PaymentIntent.
  if (session.payment_status === "no_payment_required") return true;

  const pi = session.payment_intent;
  if (pi == null) {
    // A $0 checkout in payment mode (beta-helper link, 100% coupon) completes
    // with payment_status "paid" and no PaymentIntent. Nothing was charged,
    // so nothing can be refunded: grant access.
    if (session.amount_total === 0) return true;
    // Paid/complete with no PI and a non-zero total is unexpected; do not unlock.
    return false;
  }
  return paymentIntentRefundStatus(pi) === "not_refunded";
}

/** The slice of the Stripe client that access checks use (lets tests fake it). */
export type CheckoutSessionsApi = {
  checkout: {
    sessions: {
      retrieve: (
        id: string,
        params: { expand: string[] },
      ) => Promise<Stripe.Checkout.Session>;
      list: (params: {
        customer_details: { email: string };
        status: "complete";
        limit: number;
        expand: string[];
      }) => AsyncIterable<Stripe.Checkout.Session>;
    };
  };
};

/** Shown when someone pays the $20 upgrade without a valid handbook purchase. */
export const UPGRADE_NOT_ELIGIBLE_MESSAGE =
  "The $20 app upgrade is only for the email that bought the handbook, and the handbook purchase can't be refunded. We couldn't find one for this payment. Email support@deepfocusfromhome.com with your receipt and we'll sort it out.";

function sessionEmail(session: Stripe.Checkout.Session): string {
  return (
    session.customer_details?.email ??
    session.customer_email ??
    ""
  ).trim();
}

/**
 * Every paid, unrefunded checkout of this site's products for one email
 * (tried lowercased and as stored, because Stripe matches exactly).
 * Same rules as "Already bought? Unlock this device" (unlockByEmail).
 */
export async function grantingSessionsForEmail(
  stripe: CheckoutSessionsApi,
  rawEmail: string,
  { excludeId }: { excludeId?: string } = {},
): Promise<{ session: Stripe.Checkout.Session; kind: SessionKind }[]> {
  const raw = rawEmail.trim();
  if (!raw) return [];
  const out: { session: Stripe.Checkout.Session; kind: SessionKind }[] = [];
  const seenIds = new Set<string>();
  for (const email of [...new Set([raw.toLowerCase(), raw])]) {
    const list = stripe.checkout.sessions.list({
      customer_details: { email },
      status: "complete",
      limit: 100,
      expand: [...CHECKOUT_SESSION_LIST_REFUND_EXPAND],
    });
    let seen = 0;
    for await (const other of list) {
      if (++seen > 300) break;
      if (other.id === excludeId || seenIds.has(other.id)) continue;
      seenIds.add(other.id);
      // Skip unpaid and fully refunded sessions (Terms §8 REFUND_ENDS_ACCESS).
      if (!checkoutSessionGrantsAccess(other)) continue;
      const kind = sessionKind(other, { strict: true });
      if (kind) out.push({ session: other, kind });
    }
  }
  return out;
}

/**
 * #108: the $20 upgrade only counts as the app when the same email has a
 * paid, unrefunded $17 handbook purchase (Terms §3).
 */
export async function upgradeHasHandbook(
  stripe: CheckoutSessionsApi,
  upgrade: Stripe.Checkout.Session,
): Promise<boolean> {
  const email = sessionEmail(upgrade);
  if (!email) return false;
  const others = await grantingSessionsForEmail(stripe, email, {
    excludeId: upgrade.id,
  });
  return others.some((o) => o.kind === "handbook");
}

/**
 * Terms §8: "Refunding a duplicate charge doesn't affect your access."
 * When a session was fully refunded, look for another completed checkout by
 * the same email that still grants access (paid, not fully refunded, this
 * site's product) and covers the refunded product (app covers handbook).
 * Returns that session, or null when none does (access really ended).
 * Same rules as "Already bought? Unlock this device" (unlockByEmail).
 */
export async function findOtherSessionStillGrantingAccess(
  stripe: CheckoutSessionsApi,
  refunded: Stripe.Checkout.Session,
): Promise<Stripe.Checkout.Session | null> {
  const refundedKind = sessionKind(refunded, { strict: false });
  if (!refundedKind) return null;
  const needed = refundedKind === "upgrade" ? "app" : refundedKind;
  const email = sessionEmail(refunded);
  if (!email) return null;

  const others = await grantingSessionsForEmail(stripe, email, {
    excludeId: refunded.id,
  });
  const best = combineSessionKinds(others.map((o) => o.kind));
  if (!best || !hasAccess(best, needed)) return null;
  if (best === "app") {
    // A full-price app purchase first, else the upgrade (its handbook is valid).
    return (
      others.find((o) => o.kind === "app")?.session ??
      others.find((o) => o.kind === "upgrade")?.session ??
      null
    );
  }
  return others.find((o) => o.kind === "handbook")?.session ?? null;
}

/**
 * Confirm a Checkout Session is paid/complete and not fully refunded before
 * issuing downloads or unlocking. Fail closed when the secret key is missing
 * or when we cannot inspect the PaymentIntent for refunds.
 *
 * If this session was fully refunded but the same customer has another paid,
 * unrefunded purchase of the same product or better (a refunded duplicate
 * charge), access continues and that other session is returned (Terms §8).
 */
export async function assertPaidCheckoutSession(
  sessionId: string,
  deps: { stripe?: CheckoutSessionsApi } = {},
): Promise<{
  sessionId: string;
  paymentStatus: string;
  session: Stripe.Checkout.Session;
}> {
  const id = sessionId.trim();
  if (!id || !id.startsWith("cs_")) {
    throw new DownloadAuthError(
      "Missing or invalid Stripe checkout session id. Open the link from your payment confirmation, or email support@deepfocusfromhome.com with your receipt.",
    );
  }

  const stripe: CheckoutSessionsApi =
    deps.stripe ?? (stripeClient() as unknown as CheckoutSessionsApi);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(id, {
      expand: [...CHECKOUT_SESSION_REFUND_EXPAND],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe session lookup failed.";
    console.error("[downloads] Stripe session retrieve failed:", message);
    throw new DownloadAuthError(
      "We could not confirm this payment. Double-check the link from checkout, or email support@deepfocusfromhome.com with your receipt.",
    );
  }

  const paymentStatus = session.payment_status ?? "";
  const status = session.status ?? "";

  if (!isPaidCheckoutSession(session)) {
    throw new DownloadAuthError(
      `This checkout session is not paid yet (status: ${status || "unknown"}, payment: ${paymentStatus || "unknown"}).`,
    );
  }

  if (!checkoutSessionGrantsAccess(session)) {
    const refund = paymentIntentRefundStatus(session.payment_intent);
    if (refund === "fully_refunded") {
      let other: Stripe.Checkout.Session | null = null;
      try {
        other = await findOtherSessionStillGrantingAccess(stripe, session);
      } catch (err) {
        console.error(
          "[downloads] Stripe duplicate-purchase lookup failed:",
          err instanceof Error ? err.message : err,
        );
      }
      if (other) {
        return {
          sessionId: other.id,
          paymentStatus: other.payment_status ?? "",
          session: other,
        };
      }
      throw new DownloadAuthError(
        "This purchase was refunded, so access has ended. Email support@deepfocusfromhome.com if you think this is a mistake.",
      );
    }
    throw new DownloadAuthError(
      "We could not confirm this payment is still valid. Email support@deepfocusfromhome.com with your receipt.",
    );
  }

  // #108: the $20 upgrade needs a paid, unrefunded handbook on the same email.
  if (sessionKind(session, { strict: false }) === "upgrade") {
    let eligible = false;
    try {
      eligible = await upgradeHasHandbook(stripe, session);
    } catch (err) {
      console.error(
        "[downloads] Stripe upgrade eligibility lookup failed:",
        err instanceof Error ? err.message : err,
      );
      throw new DownloadAuthError(
        "We could not confirm this payment right now. Try again in a minute, or email support@deepfocusfromhome.com with your receipt.",
      );
    }
    if (!eligible) throw new DownloadAuthError(UPGRADE_NOT_ELIGIBLE_MESSAGE);
  }

  return { sessionId: session.id, paymentStatus, session };
}
