import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import {
  MY_DOWNLOADS_SENT_MESSAGE,
  MY_DOWNLOADS_UNAVAILABLE_MESSAGE,
  myDownloadsForEmail as lookup,
} from "./my-downloads.server.ts";
import {
  DOWNLOADS_EMAIL_FROM,
  DOWNLOADS_EMAIL_REPLY_TO,
  DOWNLOADS_EMAIL_SUBJECT,
  sendWithResend,
  type SendEmailFn,
} from "./email.server.ts";
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

type Sent = { to: string; subject: string; text: string };

/** Runs the lookup with a mocked send and no artificial delay. */
function run(
  api: CheckoutSessionsApi,
  email: string,
  send?: SendEmailFn,
  minMs = 0,
) {
  const sent: Sent[] = [];
  const mock: SendEmailFn = send ?? (async (m) => void sent.push(m));
  return lookup(api, email, mock, minMs).then((result) => ({ result, sent }));
}

const NEUTRAL = { ok: true, message: MY_DOWNLOADS_SENT_MESSAGE };

describe("my downloads (emailed links)", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, DOWNLOAD_SIGNING_SECRET: "test-secret" };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses the exact neutral on-screen message", () => {
    assert.equal(
      MY_DOWNLOADS_SENT_MESSAGE,
      "If that email has a purchase, we've sent your download links.",
    );
  });

  it("emails signed links for all three files to a paid handbook buyer and returns no links", async () => {
    const { result, sent } = await run(fakeStripe([stripeSession("cs_1")]), EMAIL);
    assert.deepEqual(result, NEUTRAL);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, EMAIL);
    assert.equal(sent[0].subject, DOWNLOADS_EMAIL_SUBJECT);
    assert.equal(sent[0].subject, "Your Deep Focus from Home downloads");
    const urls = sent[0].text.match(/https:\/\/deepfocusfromhome\.com\/api\/download\?\S+/g) ?? [];
    assert.equal(urls.length, 3);
    const files = urls.map((u) => {
      const q = new URL(u).searchParams;
      assert.doesNotThrow(() =>
        verifySignedDownloadParams({
          file: q.get("file")!,
          exp: q.get("exp")!,
          sig: q.get("sig")!,
        }),
      );
      return q.get("file");
    });
    assert.deepEqual(files, ["handbook-desktop", "handbook-mobile", "fillables"]);
    assert.match(
      sent[0].text,
      /Links expire in about 2 hours\. You can always get new ones at deepfocusfromhome\.com\/my-downloads\./,
    );
    assert.match(sent[0].text, /support@deepfocusfromhome\.com/);
    assert.doesNotMatch(sent[0].text, /\btick/i);
  });

  it("works for an app buyer and finds the email as typed", async () => {
    const api = fakeStripe([stripeSession("cs_app", { amount: 3700, email: "Buyer@Example.com" })]);
    const { result, sent } = await run(api, "Buyer@Example.com");
    assert.deepEqual(result, NEUTRAL);
    assert.equal(sent.length, 1);
  });

  it("sends nothing to a fully refunded buyer and shows the same message", async () => {
    const api = fakeStripe([stripeSession("cs_ref", { refunded: 1700 })]);
    const { result, sent } = await run(api, EMAIL);
    assert.deepEqual(result, NEUTRAL);
    assert.equal(sent.length, 0);
  });

  it("still emails when one of two duplicate charges was refunded", async () => {
    const api = fakeStripe([
      stripeSession("cs_a", { refunded: 1700 }),
      stripeSession("cs_b"),
    ]);
    const { sent } = await run(api, EMAIL);
    assert.equal(sent.length, 1);
  });

  it("gives the identical result for unknown, refunded and purchased emails", async () => {
    const api = fakeStripe([
      stripeSession("cs_ref", { refunded: 1700 }),
      stripeSession("cs_paid", { email: "paid@example.com" }),
    ]);
    const unknown = await run(api, "nobody@example.com");
    const refunded = await run(api, EMAIL);
    const paid = await run(api, "paid@example.com");
    assert.deepEqual(unknown.result, refunded.result);
    assert.deepEqual(unknown.result, paid.result);
    assert.equal(unknown.sent.length + refunded.sent.length, 0);
    assert.equal(paid.sent.length, 1);
  });

  it("does not email for the $20 upgrade without a handbook purchase", async () => {
    const api = fakeStripe([stripeSession("cs_up", { amount: 2000, product: "upgrade" })]);
    const { result, sent } = await run(api, EMAIL);
    assert.deepEqual(result, NEUTRAL);
    assert.equal(sent.length, 0);
  });

  it("shows the same neutral message even if the email send fails", async () => {
    const { result } = await run(fakeStripe([stripeSession("cs_1")]), EMAIL, async () => {
      throw new Error("resend down");
    });
    assert.deepEqual(result, NEUTRAL);
  });

  it("holds every response for the minimum time", async () => {
    const t0 = Date.now();
    await run(fakeStripe([]), "nobody@example.com", undefined, 150);
    assert.ok(Date.now() - t0 >= 140);
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
    const { result, sent } = await run(api, EMAIL);
    assert.deepEqual(result, { ok: false, error: MY_DOWNLOADS_UNAVAILABLE_MESSAGE });
    assert.equal(sent.length, 0);
  });
});

describe("Resend sender", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    process.env = { ...ORIGINAL_ENV };
  });

  it("posts the right from, reply-to, subject and text (mocked fetch, fake key)", async () => {
    process.env = { ...ORIGINAL_ENV, RESEND_API_KEY: "re_fake_test_key" };
    let seen: { url: string; init: RequestInit } | undefined;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    await sendWithResend({ to: EMAIL, subject: "S", text: "T" });
    assert.equal(seen!.url, "https://api.resend.com/emails");
    const body = JSON.parse(String(seen!.init.body));
    assert.equal(body.from, "Deep Focus from Home <support@deepfocusfromhome.com>");
    assert.equal(body.from, DOWNLOADS_EMAIL_FROM);
    assert.equal(body.reply_to, "support@deepfocusfromhome.com");
    assert.equal(body.reply_to, DOWNLOADS_EMAIL_REPLY_TO);
    assert.deepEqual(body.to, [EMAIL]);
    assert.equal(body.subject, "S");
    assert.equal(body.text, "T");
  });

  it("throws without a key and when Resend rejects", async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.RESEND_API_KEY;
    await assert.rejects(sendWithResend({ to: EMAIL, subject: "S", text: "T" }));
    process.env = { ...ORIGINAL_ENV, RESEND_API_KEY: "re_fake_test_key" };
    globalThis.fetch = (async () => new Response("no", { status: 403 })) as typeof fetch;
    await assert.rejects(sendWithResend({ to: EMAIL, subject: "S", text: "T" }), /403/);
  });
});
