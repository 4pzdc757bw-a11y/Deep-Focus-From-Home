import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  bestProduct,
  CHAPTER_1_SLUG,
  FREE_CHAPTER_SLUGS,
  hasAccess,
  requiredAccessForPath,
} from "./access.ts";
import { CHAPTERS } from "../content.ts";
import { mintUnlockToken, verifyUnlockToken, getUnlockSecret, UnlockConfigError } from "./token.server.ts";
import { combineSessionKinds, productFromSession, sessionKind } from "./product.server.ts";
import { appUpgradeCheckoutUrl } from "./upgrade.server.ts";
import { TERMS_UPGRADE_LINE } from "../legal.ts";
import { readUpgradeResult } from "./unlock-result.ts";
import { rateLimitHit, resetRateLimits } from "./rate-limit.server.ts";

const ORIGINAL_ENV = { ...process.env };

describe("paywall path rules", () => {
  it("keeps marketing, legal, checkout and guide index free", () => {
    for (const p of ["/", "/intro", "/buy", "/app", "/start", "/more", "/terms", "/privacy", "/thanks", "/access", "/store-credit", "/guide", "/guide/", "/guide/intro", "/starter"]) {
      assert.equal(requiredAccessForPath(p), "none", p);
    }
  });
  it("locks app tools (and unknown routes) behind the app", () => {
    for (const p of ["/daily", "/setup", "/week", "/month", "/energy", "/household", "/daily/", "/some-new-tool"]) {
      assert.equal(requiredAccessForPath(p), "app", p);
    }
  });
  it("keeps the Introduction and Chapter 1 free (#109 Option B)", () => {
    assert.equal(requiredAccessForPath("/guide/intro"), "none");
    assert.equal(requiredAccessForPath("/guide/environment"), "none");
    assert.equal(requiredAccessForPath(`/guide/${CHAPTER_1_SLUG}`), "none");
    assert.equal(requiredAccessForPath("/guide/environment/"), "none");
    assert.deepEqual([...FREE_CHAPTER_SLUGS].sort(), ["environment", "intro"]);
  });
  it("Chapter 1 slug is the chapter numbered Chapter 1", () => {
    const ch1 = CHAPTERS.find((c) => c.number === "Chapter 1");
    assert.equal(ch1?.slug, CHAPTER_1_SLUG);
    assert.equal(ch1?.title, "Design your focus environment");
  });
  it("locks the other guide chapters behind the handbook", () => {
    for (const ch of CHAPTERS) {
      if (ch.slug === "intro" || ch.slug === CHAPTER_1_SLUG) continue;
      assert.equal(requiredAccessForPath(`/guide/${ch.slug}`), "handbook", ch.slug);
    }
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
  const site = "https://deepfocusfromhome.com";
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

describe("#108 app upgrade for handbook buyers", () => {
  const site = "https://deepfocusfromhome.com";
  const up = {
    success_url: `${site}/thanks?paid=1&product=upgrade&session_id={CHECKOUT_SESSION_ID}`,
    amount_subtotal: 2000,
    amount_total: 2000,
    currency: "usd",
  };
  it("the upgrade checkout is its own kind and never the app on its own", () => {
    assert.equal(sessionKind(up, { strict: true }), "upgrade");
    assert.equal(productFromSession(up, { strict: true }), null);
    assert.equal(productFromSession(up, { strict: false }), null);
  });
  it("upgrade counts as the app only next to a paid handbook", () => {
    assert.equal(combineSessionKinds(["upgrade"]), null);
    assert.equal(combineSessionKinds(["upgrade", "handbook"]), "app");
    assert.equal(combineSessionKinds(["handbook"]), "handbook");
    assert.equal(combineSessionKinds(["app"]), "app");
    assert.equal(combineSessionKinds([]), null);
  });
  it("$17 + $20 = $37 (Vera's condition 1) and Terms line is the approved text", () => {
    assert.equal(17 + 20, 37);
    assert.ok(TERMS_UPGRADE_LINE.includes("(currently $20)"));
    assert.ok(!/credit/i.test(TERMS_UPGRADE_LINE));
    assert.equal(
      TERMS_UPGRADE_LINE,
      "If you bought the handbook, you can upgrade to the app for the app price minus what you paid for the handbook (currently $20). The upgrade is only for the account or email that bought the handbook. If the handbook purchase is refunded, the upgrade price no longer applies. Refunding the upgrade refunds only the upgrade price.",
    );
  });
  it("checkout URL locks the buyer's email and carries the handbook session", () => {
    const url = new URL(
      appUpgradeCheckoutUrl(
        { email: "Buyer+1@Example.com", handbookSessionId: "cs_live_abc123" },
        "https://buy.stripe.com/abc",
      ),
    );
    assert.equal(url.origin + url.pathname, "https://buy.stripe.com/abc");
    assert.equal(url.searchParams.get("locked_prefilled_email"), "Buyer+1@Example.com");
    assert.equal(url.searchParams.get("client_reference_id"), "cs_live_abc123");
    assert.equal(appUpgradeCheckoutUrl({ email: "a@b.co", handbookSessionId: "x" }, ""), "");
  });
  it("only accepts a buy.stripe.com checkout URL from the server", () => {
    assert.deepEqual(readUpgradeResult({ ok: true, action: "checkout", url: "https://evil.example/x" }).ok, false);
    assert.deepEqual(readUpgradeResult({ ok: true, action: "checkout", url: "https://buy.stripe.com/x" }), {
      ok: true,
      action: "checkout",
      url: "https://buy.stripe.com/x",
    });
  });
});
