import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkoutSessionGrantsAccess,
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
