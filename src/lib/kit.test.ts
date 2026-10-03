import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KIT_FORM_ACTION, readKitResponse, safeGuardUrl } from "./kit.ts";

describe("Kit form response", () => {
  it("posts to the public form 9995411 endpoint", () => {
    assert.equal(KIT_FORM_ACTION, "https://app.kit.com/forms/9995411/subscriptions");
  });
  it("success → ok", () => {
    assert.deepEqual(readKitResponse(true, { status: "success", consent: { enabled: false } }), { ok: true });
  });
  it("quarantined → security check url", () => {
    const url = "https://app.kit.com/forms/guards/abc";
    assert.deepEqual(readKitResponse(true, { status: "quarantined", url }), { ok: true, guardUrl: url });
  });
  it("ignores non-Kit guard urls", () => {
    assert.equal(safeGuardUrl("https://evil.example/x"), undefined);
    assert.deepEqual(readKitResponse(true, { status: "quarantined", url: "https://evil.example/x" }), { ok: false });
  });
  it("consent step → guard url", () => {
    const url = "https://app.kit.com/consent/xyz";
    assert.deepEqual(readKitResponse(true, { status: "success", consent: { enabled: true, url } }), { ok: true, guardUrl: url });
  });
  it("failed → first message", () => {
    assert.deepEqual(readKitResponse(false, { status: "failed", errors: { messages: ["Email address is invalid"] } }), { ok: false, message: "Email address is invalid" });
    assert.deepEqual(readKitResponse(true, null), { ok: false, message: undefined });
  });
});
