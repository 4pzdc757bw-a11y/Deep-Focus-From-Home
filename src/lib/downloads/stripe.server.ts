import Stripe from "stripe";
import {
  DownloadAuthError,
  DownloadConfigError,
} from "./errors.ts";

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
    // Paid/complete with no PI is unexpected; do not unlock.
    return false;
  }
  return paymentIntentRefundStatus(pi) === "not_refunded";
}

/**
 * Confirm a Checkout Session is paid/complete and not fully refunded before
 * issuing downloads or unlocking. Fail closed when the secret key is missing
 * or when we cannot inspect the PaymentIntent for refunds.
 */
export async function assertPaidCheckoutSession(
  sessionId: string,
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

  let session: Stripe.Checkout.Session;
  try {
    session = await stripeClient().checkout.sessions.retrieve(id, {
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
      throw new DownloadAuthError(
        "This purchase was refunded, so access has ended. Email support@deepfocusfromhome.com if you think this is a mistake.",
      );
    }
    throw new DownloadAuthError(
      "We could not confirm this payment is still valid. Email support@deepfocusfromhome.com with your receipt.",
    );
  }

  return { sessionId: session.id, paymentStatus, session };
}
