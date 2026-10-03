/**
 * Client-safe result shape for "Already bought? Unlock this device".
 * Expected failures (no purchase, rate limit, bad email) come back as data,
 * not thrown errors, so the message can never be lost in error
 * serialization between the server function and the browser.
 */
import type { UnlockProduct } from "./access.ts";

export type UnlockByEmailResult =
  | { ok: true; product: UnlockProduct }
  | { ok: false; error: string };

export const UNLOCK_FALLBACK_MESSAGE =
  "Something went wrong. Try again, or email jeffrey@jeffsebiz.com with your Stripe receipt.";

export const NO_PURCHASE_MESSAGE =
  "No purchase found for that email. Use the email you entered at checkout, or email jeffrey@jeffsebiz.com with your Stripe receipt.";

function messageOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "message" in value) {
    const m = (value as { message?: unknown }).message;
    if (typeof m === "string") return m.trim();
  }
  return "";
}

/** Sensible text for anything thrown by the call (Error, string, plain object, Response…). */
export function unlockErrorText(err: unknown): string {
  const msg = messageOf(err);
  // Never show an HTML error page or a huge blob as the message.
  if (!msg || msg.length > 400 || /<\/?[a-z][\s\S]*>/i.test(msg)) return UNLOCK_FALLBACK_MESSAGE;
  return msg;
}

/**
 * Read what the server function returned. Anything that is not a clear
 * success (including an unexpected Response or empty value) is an error
 * with a visible message, never a silent no-op.
 */
export function readUnlockResult(value: unknown): UnlockByEmailResult {
  if (value && typeof value === "object") {
    const v = value as { ok?: unknown; product?: unknown; error?: unknown };
    if (v.ok === true && (v.product === "app" || v.product === "handbook")) {
      return { ok: true, product: v.product };
    }
    if (v.ok === false) {
      const msg = messageOf(v.error);
      return { ok: false, error: msg || UNLOCK_FALLBACK_MESSAGE };
    }
  }
  return { ok: false, error: UNLOCK_FALLBACK_MESSAGE };
}
