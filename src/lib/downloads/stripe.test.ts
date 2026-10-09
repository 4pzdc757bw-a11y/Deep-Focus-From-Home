import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import {
  assertPaidCheckoutSession,
  checkoutSessionGrantsAccess,
  type CheckoutSessionsApi,
  isPaidCheckoutSession,
  paymentIntentRefundStatus,
  type ChargeRefundFields,
  type CheckoutAccessSession,
  type PaymentIntentRefundFields,
} from "./stripe.server.ts";

function session(opts: {
  payment_status?: CheckoutAccessSession["payment_status"];
  status?: CheckoutAccessSession["status"];
  payment_intent?: CheckoutAccessSession["payment_intent"];
}): CheckoutAccessSession {
  return {
    payment_status: opts.payment_status ?? "paid",
    status: opts.status ?? "complete",
    payment_intent: opts.payment_intent === undefined ? null : opts.payment_intent,
  };
}

function charge(
  amount: number,
  amount_refunded: number,
  refunded = amount_refunded >= amount && amount > 0,
): ChargeRefundFields {
  return { amount, amount_refunded, refunded };
}

function pi(
  amount: number,
  latest_charge: PaymentIntentRefundFields["latest_charge"],
): PaymentIntentRefundFields {
  return { amount, latest_charge };
}

describe("isPaidCheckoutSession", () => {
  it("treats paid, no_payment_required, and complete as paid", () => {
    assert.equal(isPaidCheckoutSession(session({ payment_status: "paid" })), true);
    assert.equal(
      isPaidCheckoutSession(session({ payment_status: "no_payment_required" })),
      true,
    );
    assert.equal(
      isPaidCheckoutSession(
        session({ payment_status: "unpaid", status: "complete" }),
      ),
      true,
    );
    assert.equal(
      isPaidCheckoutSession(
        session({ payment_status: "unpaid", status: "open" }),
      ),
      false,
    );
  });
});

describe("paymentIntentRefundStatus", () => {
  it("treats null PI as not refunded (free checkout)", () => {
    assert.equal(paymentIntentRefundStatus(null), "not_refunded");
    assert.equal(paymentIntentRefundStatus(undefined), "not_refunded");
  });

  it("returns unknown for unexpanded PI or charge ids", () => {
    assert.equal(paymentIntentRefundStatus("pi_abc"), "unknown");
    assert.equal(paymentIntentRefundStatus(pi(3700, "ch_abc")), "unknown");
  });

  it("detects full refunds via refunded flag or amount_refunded", () => {
    assert.equal(
      paymentIntentRefundStatus(pi(3700, charge(3700, 3700, true))),
      "fully_refunded",
    );
    assert.equal(
      paymentIntentRefundStatus(pi(3700, charge(3700, 3700, false))),
      "fully_refunded",
    );
  });

  it("leaves partial refunds as not_refunded", () => {
    assert.equal(
      paymentIntentRefundStatus(pi(3700, charge(3700, 1000, false))),
      "not_refunded",
    );
  });

  it("treats zero-amount PI with no charge as not refunded", () => {
    assert.equal(paymentIntentRefundStatus(pi(0, null)), "not_refunded");
  });

  it("returns unknown when a paid PI has no charge to inspect", () => {
    assert.equal(paymentIntentRefundStatus(pi(3700, null)), "unknown");
  });
});

describe("checkoutSessionGrantsAccess", () => {
  it("denies unpaid sessions", () => {
    assert.equal(
      checkoutSessionGrantsAccess(
        session({ payment_status: "unpaid", status: "open", payment_intent: null }),
      ),
      false,
    );
  });

  it("allows no_payment_required without a PaymentIntent", () => {
    assert.equal(
      checkoutSessionGrantsAccess(
        session({
          payment_status: "no_payment_required",
          status: "complete",
          payment_intent: null,
        }),
      ),
      true,
    );
  });

  it("allows a paid session with an expanded non-refunded charge", () => {
    assert.equal(
      checkoutSessionGrantsAccess(
        session({
          payment_intent: pi(3700, charge(3700, 0, false)),
        }),
      ),
      true,
    );
  });

  it("denies a fully refunded paid session", () => {
    assert.equal(
      checkoutSessionGrantsAccess(
        session({
          payment_intent: pi(3700, charge(3700, 3700, true)),
        }),
      ),
      false,
    );
  });

  it("fails closed when PaymentIntent was not expanded", () => {
    assert.equal(
      checkoutSessionGrantsAccess(session({ payment_intent: "pi_not_expanded" })),
      false,
    );
  });

  it("fails closed when paid session has no PaymentIntent", () => {
    assert.equal(
      checkoutSessionGrantsAccess(
        session({ payment_status: "paid", payment_intent: null }),
      ),
      false,
    );
  });

  it("still grants access after a partial refund", () => {
    assert.equal(
      checkoutSessionGrantsAccess(
        session({
          payment_intent: pi(3700, charge(3700, 500, false)),
        }),
      ),
      true,
    );
  });
});

/**
 * Terms §8: "Refunding a duplicate charge doesn't affect your access."
 * assertPaidCheckoutSession with a fake Stripe client (no network).
 */
describe("assertPaidCheckoutSession refunds (Terms §8)", () => {
  const EMAIL = "Buyer@Example.com";
  const REFUNDED_MESSAGE =
    "This purchase was refunded, so access has ended. Email support@deepfocusfromhome.com if you think this is a mistake.";

  function stripeSession(
    id: string,
    opts: {
      amount?: number;
      refunded?: number;
      email?: string;
      product?: "handbook" | "app";
    } = {},
  ): Stripe.Checkout.Session {
    const amount = opts.amount ?? 1700;
    const product = opts.product ?? (amount >= 3700 ? "app" : "handbook");
    return {
      id,
      object: "checkout.session",
      payment_status: "paid",
      status: "complete",
      amount_subtotal: amount,
      amount_total: amount,
      currency: "usd",
      success_url: `https://deepfocusfromhome.com/thanks?product=${product}&session_id={CHECKOUT_SESSION_ID}`,
      customer_details: { email: opts.email ?? EMAIL },
      customer_email: null,
      payment_intent: pi(amount, charge(amount, opts.refunded ?? 0)),
    } as unknown as Stripe.Checkout.Session;
  }

  function fakeStripe(all: Stripe.Checkout.Session[]) {
    const listedEmails: string[] = [];
    const api: CheckoutSessionsApi = {
      checkout: {
        sessions: {
          retrieve: async (id) => {
            const found = all.find((s) => s.id === id);
            if (!found) throw new Error("No such checkout session");
            return found;
          },
          list: (params) => {
            listedEmails.push(params.customer_details.email);
            const matches = all.filter(
              (s) => s.customer_details?.email === params.customer_details.email,
            );
            return (async function* () {
              yield* matches;
            })();
          },
        },
      },
    };
    return { api, listedEmails };
  }

  it("keeps access when one of two duplicate charges is fully refunded", async () => {
    const refunded = stripeSession("cs_dup_refunded", { refunded: 1700 });
    const kept = stripeSession("cs_dup_kept");
    const { api } = fakeStripe([refunded, kept]);
    const result = await assertPaidCheckoutSession("cs_dup_refunded", {
      stripe: api,
    });
    assert.equal(result.sessionId, "cs_dup_kept");
    assert.equal(result.session.id, "cs_dup_kept");
  });

  it("keeps access when the other purchase is the app (app covers handbook)", async () => {
    const refunded = stripeSession("cs_hb_refunded", { refunded: 1700 });
    const app = stripeSession("cs_app", { amount: 3700 });
    const { api } = fakeStripe([refunded, app]);
    const result = await assertPaidCheckoutSession("cs_hb_refunded", {
      stripe: api,
    });
    assert.equal(result.sessionId, "cs_app");
  });

  it("ends access for a single fully refunded purchase", async () => {
    const refunded = stripeSession("cs_single_refunded", { refunded: 1700 });
    const { api } = fakeStripe([refunded]);
    await assert.rejects(
      assertPaidCheckoutSession("cs_single_refunded", { stripe: api }),
      { name: "DownloadAuthError", message: REFUNDED_MESSAGE },
    );
  });

  it("ends access when every duplicate was refunded", async () => {
    const a = stripeSession("cs_a", { refunded: 1700 });
    const b = stripeSession("cs_b", { refunded: 1700 });
    const { api } = fakeStripe([a, b]);
    await assert.rejects(assertPaidCheckoutSession("cs_a", { stripe: api }), {
      message: REFUNDED_MESSAGE,
    });
  });

  it("does not let a cheaper handbook purchase keep a refunded app", async () => {
    const app = stripeSession("cs_app_refunded", { amount: 3700, refunded: 3700 });
    const handbook = stripeSession("cs_hb");
    const { api } = fakeStripe([app, handbook]);
    await assert.rejects(
      assertPaidCheckoutSession("cs_app_refunded", { stripe: api }),
      { message: REFUNDED_MESSAGE },
    );
  });

  it("ignores another customer's purchase", async () => {
    const refunded = stripeSession("cs_mine", { refunded: 1700 });
    const theirs = stripeSession("cs_theirs", { email: "someone@else.com" });
    const { api } = fakeStripe([refunded, theirs]);
    await assert.rejects(assertPaidCheckoutSession("cs_mine", { stripe: api }), {
      message: REFUNDED_MESSAGE,
    });
  });

  it("matches the customer's email lowercased as well as as-stored", async () => {
    const refunded = stripeSession("cs_r", { refunded: 1700 });
    const kept = stripeSession("cs_k", { email: EMAIL.toLowerCase() });
    const { api, listedEmails } = fakeStripe([refunded, kept]);
    const result = await assertPaidCheckoutSession("cs_r", { stripe: api });
    assert.equal(result.sessionId, "cs_k");
    assert.equal(listedEmails[0], EMAIL.toLowerCase());
  });

  it("keeps access after a partial refund without looking anything up", async () => {
    const partial = stripeSession("cs_partial", { refunded: 500 });
    const { api, listedEmails } = fakeStripe([partial]);
    const result = await assertPaidCheckoutSession("cs_partial", {
      stripe: api,
    });
    assert.equal(result.sessionId, "cs_partial");
    assert.equal(listedEmails.length, 0);
  });

  it("ends access (fails closed) when the duplicate lookup errors", async () => {
    const refunded = stripeSession("cs_err", { refunded: 1700 });
    const { api } = fakeStripe([refunded]);
    api.checkout.sessions.list = () => {
      throw new Error("Stripe is down");
    };
    await assert.rejects(assertPaidCheckoutSession("cs_err", { stripe: api }), {
      message: REFUNDED_MESSAGE,
    });
  });
});
