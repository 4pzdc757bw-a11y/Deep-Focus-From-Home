import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import type { CheckoutSessionsApi } from "../downloads/stripe.server.ts";
import {
  RECHECK_INTERVAL_SECONDS,
  RECHECK_RETRY_SECONDS,
  recheckDue,
  recheckUnlock,
} from "./recheck.server.ts";
import { pickBackingSession } from "./product.server.ts";
import {
  mintUnlockToken,
  verifyUnlockToken,
  type UnlockTokenPayload,
} from "./token.server.ts";

const EMAIL = "Buyer@Example.com";
const NOW = 1_800_000_000;
const DAY = RECHECK_INTERVAL_SECONDS;

function stripeSession(
  id: string,
  opts: {
    amount?: number;
    refunded?: number;
    product?: "handbook" | "app" | "upgrade";
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
    customer_details: { email: EMAIL },
    customer_email: null,
    payment_intent: {
      amount,
      latest_charge: {
        amount,
        amount_refunded: opts.refunded ?? 0,
        refunded: (opts.refunded ?? 0) >= amount,
      },
    },
  } as unknown as Stripe.Checkout.Session;
}

function fakeStripe(all: Stripe.Checkout.Session[]) {
  const calls = { retrieve: 0, list: 0 };
  const api: CheckoutSessionsApi = {
    checkout: {
      sessions: {
        retrieve: async (id) => {
          calls.retrieve++;
          const found = all.find((s) => s.id === id);
          if (!found) throw new Error("No such checkout session");
          return found;
        },
        list: (params) => {
          calls.list++;
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
  return { api, calls };
}

function cookie(
  p: "handbook" | "app",
  s: string | undefined,
  n: number | undefined,
): UnlockTokenPayload {
  const out: UnlockTokenPayload = { p, iat: NOW - 10 * DAY, exp: NOW + 300 * DAY };
  if (s) out.s = s;
  if (typeof n === "number") out.n = n;
  return out;
}

let errorSpy: typeof console.error;
beforeEach(() => {
  errorSpy = console.error;
  console.error = () => {};
});
afterEach(() => {
  console.error = errorSpy;
});

describe("refund recheck for an already-unlocked browser", () => {
  it("locks (clears the cookie) when the purchase was fully refunded", async () => {
    const { api } = fakeStripe([stripeSession("cs_1", { refunded: 1700 })]);
    const out = await recheckUnlock(cookie("handbook", "cs_1", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
    });
    assert.deepEqual(out, { action: "revoke" });
  });

  it("locks the $37 app when it was fully refunded", async () => {
    const { api } = fakeStripe([
      stripeSession("cs_app", { amount: 3700, refunded: 3700 }),
    ]);
    const out = await recheckUnlock(cookie("app", "cs_app", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
    });
    assert.deepEqual(out, { action: "revoke" });
  });

  it("does not lock after a partial refund", async () => {
    const { api } = fakeStripe([stripeSession("cs_1", { refunded: 500 })]);
    const out = await recheckUnlock(cookie("handbook", "cs_1", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
    });
    assert.deepEqual(out, {
      action: "renew",
      product: "handbook",
      sessionId: "cs_1",
      nextCheck: NOW + DAY,
    });
  });

  it("keeps access when a refunded duplicate has another valid purchase", async () => {
    const { api } = fakeStripe([
      stripeSession("cs_dup", { refunded: 1700 }),
      stripeSession("cs_kept"),
    ]);
    const out = await recheckUnlock(cookie("handbook", "cs_dup", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
    });
    assert.deepEqual(out, {
      action: "renew",
      product: "handbook",
      sessionId: "cs_kept",
      nextCheck: NOW + DAY,
    });
  });

  it("an app refund with only a handbook left drops to the handbook, not to nothing", async () => {
    const { api } = fakeStripe([
      stripeSession("cs_app", { amount: 3700, refunded: 3700 }),
      stripeSession("cs_hb"),
    ]);
    const out = await recheckUnlock(cookie("app", "cs_app", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
    });
    assert.deepEqual(out, {
      action: "downgrade",
      product: "handbook",
      sessionId: "cs_hb",
      nextCheck: NOW + DAY,
    });
  });

  it("refunding the $20 upgrade keeps the handbook; refunding the handbook ends the upgraded app", async () => {
    const upgradeRefunded = fakeStripe([
      stripeSession("cs_up", { amount: 2000, product: "upgrade", refunded: 2000 }),
      stripeSession("cs_hb"),
    ]);
    const a = await recheckUnlock(cookie("app", "cs_up", NOW - 5), {
      stripe: () => upgradeRefunded.api,
      nowSeconds: NOW,
    });
    assert.equal(a.action, "downgrade");

    const handbookRefunded = fakeStripe([
      stripeSession("cs_up", { amount: 2000, product: "upgrade" }),
      stripeSession("cs_hb", { refunded: 1700 }),
    ]);
    const b = await recheckUnlock(cookie("app", "cs_up", NOW - 5), {
      stripe: () => handbookRefunded.api,
      nowSeconds: NOW,
    });
    assert.deepEqual(b, { action: "revoke" });
  });

  it("keeps access (and retries soon) when Stripe errors", async () => {
    const api: CheckoutSessionsApi = {
      checkout: {
        sessions: {
          retrieve: async () => {
            throw new Error("Stripe is down");
          },
          list: () => {
            throw new Error("Stripe is down");
          },
        },
      },
    };
    const out = await recheckUnlock(cookie("handbook", "cs_1", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
    });
    assert.deepEqual(out, { action: "keep", nextCheck: NOW + RECHECK_RETRY_SECONDS });
  });

  it("keeps access when the Stripe client cannot even be built (missing key)", async () => {
    const out = await recheckUnlock(cookie("handbook", "cs_1", NOW - 5), {
      stripe: () => {
        throw new Error("STRIPE_SECRET_KEY is not set");
      },
      nowSeconds: NOW,
    });
    assert.equal(out.action, "keep");
  });

  it("keeps access when Stripe is slow (short timeout)", async () => {
    const api: CheckoutSessionsApi = {
      checkout: {
        sessions: {
          retrieve: () => new Promise(() => {}), // never answers
          list: () => (async function* () {})(),
        },
      },
    };
    const started = Date.now();
    const out = await recheckUnlock(cookie("handbook", "cs_1", NOW - 5), {
      stripe: () => api,
      nowSeconds: NOW,
      timeoutMs: 40,
    });
    assert.deepEqual(out, { action: "keep", nextCheck: NOW + RECHECK_RETRY_SECONDS });
    assert.ok(Date.now() - started < 1000);
  });

  it("does not recheck within a day (no Stripe call at all)", async () => {
    let built = 0;
    const { api, calls } = fakeStripe([stripeSession("cs_1", { refunded: 1700 })]);
    const out = await recheckUnlock(cookie("handbook", "cs_1", NOW + DAY - 100), {
      stripe: () => {
        built++;
        return api;
      },
      nowSeconds: NOW,
    });
    assert.deepEqual(out, { action: "skip" });
    assert.equal(built, 0);
    assert.equal(calls.retrieve + calls.list, 0);
  });

  it("leaves old cookies with no purchase info alone", async () => {
    let built = 0;
    const out = await recheckUnlock(cookie("handbook", undefined, undefined), {
      stripe: () => {
        built++;
        return fakeStripe([]).api;
      },
      nowSeconds: NOW,
    });
    assert.deepEqual(out, { action: "skip" });
    assert.equal(built, 0);
  });

  it("rechecks once the day is up", () => {
    assert.equal(recheckDue({ s: "cs_1", n: NOW + 1 }, NOW), false);
    assert.equal(recheckDue({ s: "cs_1", n: NOW }, NOW), true);
    assert.equal(recheckDue({ s: "cs_1" }, NOW), true);
    assert.equal(recheckDue({}, NOW), false);
  });
});

describe("unlock cookie records the backing purchase", () => {
  it("round-trips the session id and next-check time, with no email in the token", () => {
    process.env.UNLOCK_SECRET = "test-secret";
    const token = mintUnlockToken("handbook", NOW, 1000, { s: "cs_abc", n: NOW + DAY });
    const body = Buffer.from(token.split(".")[1]!, "base64").toString("utf8");
    assert.doesNotMatch(body, /@/);
    const payload = verifyUnlockToken(token, NOW + 1);
    assert.equal(payload?.s, "cs_abc");
    assert.equal(payload?.n, NOW + DAY);
  });

  it("old tokens without purchase info still verify", () => {
    process.env.UNLOCK_SECRET = "test-secret";
    const payload = verifyUnlockToken(mintUnlockToken("app", NOW, 1000), NOW + 1);
    assert.equal(payload?.p, "app");
    assert.equal(payload?.s, undefined);
  });

  it("ignores a malformed session id", () => {
    process.env.UNLOCK_SECRET = "test-secret";
    const token = mintUnlockToken("app", NOW, 1000, { s: "not-a-session" });
    assert.equal(verifyUnlockToken(token, NOW + 1)?.s, undefined);
  });

  it("picks the right purchase to back each product", () => {
    const sessions = [
      { kind: "handbook" as const, id: "h" },
      { kind: "upgrade" as const, id: "u" },
      { kind: "app" as const, id: "a" },
    ];
    assert.equal(pickBackingSession(sessions, "handbook")?.id, "h");
    assert.equal(pickBackingSession(sessions, "app")?.id, "a");
    assert.equal(pickBackingSession(sessions.slice(0, 2), "app")?.id, "u");
    assert.equal(pickBackingSession([], "app"), null);
  });
});
