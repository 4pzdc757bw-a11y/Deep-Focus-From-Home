import Stripe from "stripe";
import {
  DownloadAuthError,
  DownloadConfigError,
} from "./errors";

/**
 * Restricted Stripe secret key with Checkout Sessions: Read is enough.
 * Never expose to the client; never commit a real key.
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

function stripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

/**
 * Confirm a Checkout Session is paid/complete before issuing downloads.
 * Fail closed when the secret key is missing (no file leak).
 */
export async function assertPaidCheckoutSession(
  sessionId: string,
): Promise<{ sessionId: string; paymentStatus: string }> {
  const id = sessionId.trim();
  if (!id || !id.startsWith("cs_")) {
    throw new DownloadAuthError(
      "Missing or invalid Stripe checkout session id. Open the link from your payment confirmation, or email jeffrey@jeffsebiz.com with your receipt.",
    );
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripeClient().checkout.sessions.retrieve(id);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe session lookup failed.";
    console.error("[downloads] Stripe session retrieve failed:", message);
    throw new DownloadAuthError(
      "Could not verify this payment with Stripe. Double-check the link from checkout, or email jeffrey@jeffsebiz.com with your receipt.",
    );
  }

  const paymentStatus = session.payment_status ?? "";
  const status = session.status ?? "";
  const paid =
    paymentStatus === "paid" ||
    paymentStatus === "no_payment_required" ||
    status === "complete";

  if (!paid) {
    throw new DownloadAuthError(
      `This checkout session is not paid yet (status: ${status || "unknown"}, payment: ${paymentStatus || "unknown"}).`,
    );
  }

  return { sessionId: session.id, paymentStatus };
}
