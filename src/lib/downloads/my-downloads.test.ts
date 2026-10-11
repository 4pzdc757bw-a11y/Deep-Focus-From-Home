import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import {
  MY_DOWNLOADS_NOT_FOUND_MESSAGE,
  MY_DOWNLOADS_UNAVAILABLE_MESSAGE,
  myDownloadsForEmail,
} from "./my-downloads.server.ts";
import { verifySignedDownloadParams } from "./signing.server.ts";
import type { CheckoutSessionsApi } from "./stripe.server.ts";

const ORIGINAL_ENV = { ...process.env };
const EMAIL = "buyer@example.com";

function stripeSession(
  id: string,
  opts: { amount?: number; refunded?: number; product?: string; email?: string } = {},
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

function fakeStripe(all: Stripe.Checkout.Session[]): CheckoutSessionsApi {
  return {
    checkout: {
      sessions: {
        retrieve: async () => {
          throw new Error("not used");
        },
        list: (params) => {
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
}

describe("my downloads", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, DOWNLOAD_SIGNING_SECRET: "test-secret" };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("gives signed links for all three files to a paid handbook buyer", async () => {
    const result = await myDownloadsForEmail(fakeStripe([stripeSession("cs_1")]), EMAIL);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.links.map((l) => l.key),
      ["handbook-desktop", "handbook-mobile", "fillables"],
    );
    for (const link of result.links) {
      const q = new URL(link.url, "https://x.test").searchParams;
      assert.doesNotThrow(() =>
        verifySignedDownloadParams({
          file: q.get("file")!,
          exp: q.get("exp")!,
          sig: q.get("sig")!,
        }),
      );
    }
  });

  it("works for an app buyer and finds the email as typed", async () => {
    const api = fakeStripe([stripeSession("cs_app", { amount: 3700, email: "Buyer@Example.com" })]);
    const result = await myDownloadsForEmail(api, "Buyer@Example.com");
    assert.equal(result.ok, true);
  });

  it("gives nothing to a fully refunded buyer", async () => {
    const api = fakeStripe([stripeSession("cs_ref", { refunded: 1700 })]);
    const result = await myDownloadsForEmail(api, EMAIL);
    assert.deepEqual(result, { ok: false, error: MY_DOWNLOADS_NOT_FOUND_MESSAGE });
  });

  it("still works when one of two duplicate charges was refunded", async () => {
    const api = fakeStripe([
      stripeSession("cs_a", { refunded: 1700 }),
      stripeSession("cs_b"),
    ]);
    assert.equal((await myDownloadsForEmail(api, EMAIL)).ok, true);
  });

  it("gives the same neutral message for an unknown email as for a refunded one", async () => {
    const api = fakeStripe([stripeSession("cs_ref", { refunded: 1700 })]);
    const unknown = await myDownloadsForEmail(api, "nobody@example.com");
    const refunded = await myDownloadsForEmail(api, EMAIL);
    assert.deepEqual(unknown, refunded);
    assert.match(MY_DOWNLOADS_NOT_FOUND_MESSAGE, /couldn't find a paid purchase/);
    assert.match(MY_DOWNLOADS_NOT_FOUND_MESSAGE, /support@deepfocusfromhome\.com/);
  });

  it("does not count the $20 upgrade without a handbook purchase", async () => {
    const api = fakeStripe([stripeSession("cs_up", { amount: 2000, product: "upgrade" })]);
    const result = await myDownloadsForEmail(api, EMAIL);
    assert.equal(result.ok, false);
  });

  it("returns a try-again message when Stripe fails", async () => {
    const api: CheckoutSessionsApi = {
      checkout: {
        sessions: {
          retrieve: async () => {
            throw new Error("x");
          },
          list: () => {
            throw new Error("stripe down");
          },
        },
      },
    };
    assert.deepEqual(await myDownloadsForEmail(api, EMAIL), {
      ok: false,
      error: MY_DOWNLOADS_UNAVAILABLE_MESSAGE,
    });
  });
});
