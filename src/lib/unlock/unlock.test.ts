import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { bestProduct, hasAccess, requiredAccessForPath } from "./access.ts";
import { mintUnlockToken, verifyUnlockToken, getUnlockSecret, UnlockConfigError } from "./token.server.ts";
import { productFromSession } from "./product.server.ts";
import { rateLimitHit, resetRateLimits } from "./rate-limit.server.ts";

const ORIGINAL_ENV = { ...process.env };

describe("paywall path rules", () => {
  it("keeps marketing, legal, checkout and guide index free", () => {
    for (const p of ["/", "/intro", "/buy", "/start", "/more", "/terms", "/privacy", "/thanks", "/access", "/store-credit", "/guide", "/guide/", "/guide/intro", "/starter"]) {
      assert.equal(requiredAccessForPath(p), "none", p);
    }
  });
  it("locks app tools (and unknown routes) behind the app", () => {
    for (const p of ["/daily", "/setup", "/week", "/month", "/energy", "/household", "/daily/", "/some-new-tool"]) {
      assert.equal(requiredAccessForPath(p), "app", p);
    }
  });
  it("locks full guide chapters behind the handbook", () => {
    assert.equal(requiredAccessForPath("/guide/environment"), "handbook");
    assert.equal(requiredAccessForPath("/guide/household"), "handbook");
  });
  it("app includes handbook; handbook does not include app", () => {
    assert.equal(hasAccess("app", "handbook"), true);
    assert.equal(hasAccess("app", "app"), true);
    assert.equal(hasAccess("handbook", "handbook"), true);
    assert.equal(hasAccess("handbook", "app"), false);
    assert.equal(hasAccess(null, "handbook"), false);
    assert.equal(hasAccess(null, "none"), true);
    assert.equal(bestProduct("handbook", "app"), "app");
    assert.equal(bestProduct(null, "handbook"), "handbook");
  });
});

describe("unlock token", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.UNLOCK_SECRET;
    process.env.STRIPE_SECRET_KEY = "rk_test_example";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("round-trips a signed token", () => {
    const t = mintUnlockToken("app", 1000, 60);
    assert.deepEqual(verifyUnlockToken(t, 1010), { p: "app", iat: 1000, exp: 1060 });
  });
  it("rejects tampered, expired, and garbage tokens", () => {
    const t = mintUnlockToken("handbook", 1000, 60);
    const [v, body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ p: "app", iat: 1000, exp: 1060 })).toString("base64url");
    assert.equal(verifyUnlockToken(`${v}.${forged}.${sig}`, 1010), null);
    assert.equal(verifyUnlockToken(`${v}.${body}.x${sig!.slice(1)}`, 1010), null);
    assert.equal(verifyUnlockToken(t, 2000), null);
    assert.equal(verifyUnlockToken("nope", 1010), null);
    assert.equal(verifyUnlockToken(undefined), null);
  });
  it("prefers UNLOCK_SECRET and fails closed with no secret", () => {
    const derived = getUnlockSecret();
    process.env.UNLOCK_SECRET = "explicit";
    assert.equal(getUnlockSecret(), "explicit");
    assert.notEqual(derived, "explicit");
    delete process.env.UNLOCK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    assert.throws(() => getUnlockSecret(), UnlockConfigError);
    assert.equal(verifyUnlockToken("v1.a.b"), null);
  });
});

describe("productFromSession", () => {
  const site = "https://deepfocus.jeffsebiz.com";
  const s = (success_url: string | null, amount: number | null, currency = "usd") => ({
    success_url,
    amount_subtotal: amount,
    amount_total: amount,
    currency,
  });
  it("reads ?product= from the Payment Link success URL", () => {
    assert.equal(productFromSession(s(`${site}/access?product=app&session_id={CHECKOUT_SESSION_ID}`, 3700), { strict: true }), "app");
    assert.equal(productFromSession(s(`${site}/access?product=handbook&session_id={CHECKOUT_SESSION_ID}`, 1700), { strict: true }), "handbook");
    assert.equal(productFromSession(s(`${site}/thanks?paid=1&product=handbook&session_id={CHECKOUT_SESSION_ID}`, 1700), { strict: true }), "handbook");
  });
  it("treats the $0 beta-helper checkout as the app", () => {
    assert.equal(productFromSession(s(`${site}/access?product=handbook&session_id=x`, 0), { strict: true }), "app");
    assert.equal(productFromSession(s(`${site}/access?session_id=x`, 0), { strict: true }), "app");
  });
  it("falls back to price when the URL has no product", () => {
    assert.equal(productFromSession(s(`${site}/access?session_id=x`, 3700), { strict: true }), "app");
    assert.equal(productFromSession(s(`${site}/access?session_id=x`, 1700), { strict: true }), "handbook");
    assert.equal(productFromSession(s(`${site}/access?session_id=x`, 500), { strict: true }), null);
  });
  it("strict mode ignores checkouts for other sites", () => {
    assert.equal(productFromSession(s("https://other.example/done", 3700), { strict: true }), null);
    assert.equal(productFromSession(s("https://other.example/done", 0), { strict: true }), null);
    assert.equal(productFromSession(s("https://other.example/done", 3700), { strict: false }), "app");
    assert.equal(productFromSession(s("https://other.example/done", 0), { strict: false }), null);
  });
});

describe("rate limit", () => {
  it("blocks after the limit within the window", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) assert.equal(rateLimitHit("k", 3, 1000, 100 + i), false);
    assert.equal(rateLimitHit("k", 3, 1000, 200), true);
    assert.equal(rateLimitHit("k", 3, 1000, 2000), false);
  });
});

describe("unlock form result handling", async () => {
  const { readUnlockResult, unlockErrorText, NO_PURCHASE_MESSAGE, UNLOCK_FALLBACK_MESSAGE } =
    await import("./unlock-result.ts");
  it("shows the no-purchase message returned as data", () => {
    assert.deepEqual(readUnlockResult({ ok: false, error: NO_PURCHASE_MESSAGE }), {
      ok: false,
      error: NO_PURCHASE_MESSAGE,
    });
  });
  it("accepts a real unlock", () => {
    assert.deepEqual(readUnlockResult({ ok: true, product: "app" }), { ok: true, product: "app" });
  });
  it("never treats an unexpected value as success (silent reset bug)", () => {
    for (const v of [undefined, null, {}, { product: null }, "ok", { ok: true, product: "x" }]) {
      const r = readUnlockResult(v);
      assert.equal(r.ok, false);
      assert.ok(!r.ok && r.error.length > 0);
    }
  });
  it("turns anything thrown into visible text", () => {
    assert.equal(unlockErrorText(new Error("Too many tries.")), "Too many tries.");
    assert.equal(unlockErrorText("plain string"), "plain string");
    assert.equal(unlockErrorText({ message: "obj msg" }), "obj msg");
    assert.equal(unlockErrorText(undefined), UNLOCK_FALLBACK_MESSAGE);
    assert.equal(unlockErrorText(new Error("<html><body>504</body></html>")), UNLOCK_FALLBACK_MESSAGE);
  });
});
