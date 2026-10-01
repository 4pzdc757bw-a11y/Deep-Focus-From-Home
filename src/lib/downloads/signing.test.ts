import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  DOWNLOAD_LINK_TTL_SECONDS,
  DownloadAuthError,
  DownloadConfigError,
  buildSignedDownloadPath,
  getDownloadSigningSecret,
  mintSignedDownloadParams,
  verifySignedDownloadParams,
} from "./signing.server.ts";

const ORIGINAL_ENV = { ...process.env };

describe("download signing", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DOWNLOAD_SIGNING_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("fails closed when no signing secret is configured", () => {
    assert.throws(() => getDownloadSigningSecret(), DownloadConfigError);
  });

  it("derives a signing secret from STRIPE_SECRET_KEY", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example_key_for_unit_tests";
    const a = getDownloadSigningSecret();
    const b = getDownloadSigningSecret();
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });

  it("prefers DOWNLOAD_SIGNING_SECRET over Stripe derivation", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example_key_for_unit_tests";
    process.env.DOWNLOAD_SIGNING_SECRET = "explicit-download-secret";
    assert.equal(getDownloadSigningSecret(), "explicit-download-secret");
  });

  it("mints and verifies a signed download within TTL", () => {
    process.env.DOWNLOAD_SIGNING_SECRET = "unit-test-signing-secret";
    const now = 1_700_000_000;
    const signed = mintSignedDownloadParams("handbook-desktop", undefined, now);
    assert.equal(signed.file, "handbook-desktop");
    assert.equal(signed.exp, now + DOWNLOAD_LINK_TTL_SECONDS);

    const key = verifySignedDownloadParams({
      ...signed,
      nowSeconds: now + 60,
    });
    assert.equal(key, "handbook-desktop");

    const path = buildSignedDownloadPath(signed);
    assert.match(path, /^\/api\/download\?/);
    assert.match(path, /file=handbook-desktop/);
    assert.match(path, /sig=/);
  });

  it("rejects expired and tampered signatures", () => {
    process.env.DOWNLOAD_SIGNING_SECRET = "unit-test-signing-secret";
    const now = 1_700_000_000;
    const signed = mintSignedDownloadParams("fillables", 60, now);

    assert.throws(
      () =>
        verifySignedDownloadParams({
          ...signed,
          nowSeconds: now + 120,
        }),
      DownloadAuthError,
    );

    assert.throws(
      () =>
        verifySignedDownloadParams({
          ...signed,
          sig: "not-the-real-signature",
          nowSeconds: now + 1,
        }),
      DownloadAuthError,
    );

    assert.throws(
      () =>
        verifySignedDownloadParams({
          file: "not-a-real-file",
          exp: signed.exp,
          sig: signed.sig,
          nowSeconds: now + 1,
        }),
      DownloadAuthError,
    );
  });
});
