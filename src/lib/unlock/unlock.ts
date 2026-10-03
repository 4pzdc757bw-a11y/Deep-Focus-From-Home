import { createServerFn } from "@tanstack/react-start";
import type { UnlockProduct } from "./access";
import { NO_PURCHASE_MESSAGE, type UnlockByEmailResult } from "./unlock-result";

/**
 * Device unlock server functions. Server-only modules are imported inside the
 * handlers so this file is safe to import from React components.
 */

export type UnlockStatus = {
  product: UnlockProduct | null;
  /** When this device's unlock was issued (ms, from the signed token's iat). */
  unlockedAt?: number | null;
};


async function readCookieToken() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { UNLOCK_COOKIE_NAME, verifyUnlockToken } = await import(
    "./token.server"
  );
  return verifyUnlockToken(getCookie(UNLOCK_COOKIE_NAME));
}

async function readCookieProduct(): Promise<UnlockProduct | null> {
  return (await readCookieToken())?.p ?? null;
}

/** Save the signed unlock cookie (never downgrades app → handbook). */
async function saveUnlock(product: UnlockProduct): Promise<UnlockProduct> {
  const { setCookie } = await import("@tanstack/react-start/server");
  const { UNLOCK_COOKIE_NAME, UNLOCK_TTL_SECONDS, mintUnlockToken } =
    await import("./token.server");
  const { bestProduct } = await import("./access");
  const final = bestProduct(await readCookieProduct(), product) ?? product;
  setCookie(UNLOCK_COOKIE_NAME, mintUnlockToken(final), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_TTL_SECONDS,
  });
  return final;
}

/** What this device has unlocked, read from the signed httpOnly cookie. */
export const getUnlockStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<UnlockStatus> => {
    try {
      const token = await readCookieToken();
      return {
        product: token?.p ?? null,
        unlockedAt: token?.iat ? token.iat * 1000 : null,
      };
    } catch (err) {
      console.error("[unlock] status check failed:", err);
      return { product: null, unlockedAt: null };
    }
  },
);

/** After checkout: verify the Stripe session id, then unlock this device. */
export const unlockFromCheckoutSession = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as { sessionId?: unknown };
    const sessionId =
      typeof raw.sessionId === "string" ? raw.sessionId.trim() : "";
    if (!sessionId.startsWith("cs_") || sessionId.length > 300) {
      throw new Error("Missing or invalid checkout session id.");
    }
    return { sessionId };
  })
  .handler(async ({ data }): Promise<UnlockStatus> => {
    const { assertPaidCheckoutSession } = await import(
      "../downloads/stripe.server"
    );
    const { productFromSession } = await import("./product.server");
    const { session } = await assertPaidCheckoutSession(data.sessionId);
    const product = productFromSession(session, { strict: false });
    if (!product) {
      throw new Error(
        "We could not match this payment to a Deep Focus product. Email support@jeffsebiz.com with the receipt email you got when you paid.",
      );
    }
    return { product: await saveUnlock(product) };
  });

/**
 * "Already bought? Unlock this device": look up a completed checkout by email.
 * Expected failures are returned as `{ ok: false, error }` (not thrown) so the
 * form always has a message to show.
 */
export const unlockByEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as { email?: unknown };
    const typed = typeof raw.email === "string" ? raw.email.trim().slice(0, 300) : "";
    return { email: typed.toLowerCase(), typed };
  })
  .handler(async ({ data }): Promise<UnlockByEmailResult> => {
    if (
      !data.email ||
      data.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return { ok: false, error: "Enter the email you used at checkout." };
    }
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { rateLimitHit } = await import("./rate-limit.server");
    const ip =
      (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown";
    const tenMinutes = 10 * 60 * 1000;
    if (
      rateLimitHit(`ip:${ip}`, 8, tenMinutes) ||
      rateLimitHit(`email:${data.email}`, 5, tenMinutes)
    ) {
      return { ok: false, error: "Too many tries. Wait 10 minutes and try again." };
    }

    const { stripeClient, isPaidCheckoutSession } = await import(
      "../downloads/stripe.server"
    );
    const { productFromSession } = await import("./product.server");
    const { bestProduct } = await import("./access");

    let found: UnlockProduct | null = null;
    try {
      const stripe = stripeClient();
      // Stripe matches the email exactly, so try it lowercased and as typed.
      const variants = [...new Set([data.email, data.typed])];
      for (const email of variants) {
        const list = stripe.checkout.sessions.list({
          customer_details: { email },
          status: "complete",
          limit: 100,
        });
        let seen = 0;
        for await (const session of list) {
          if (++seen > 300) break;
          if (!isPaidCheckoutSession(session)) continue;
          found = bestProduct(
            found,
            productFromSession(session, { strict: true }),
          );
          if (found === "app") break;
        }
        if (found === "app") break;
      }
    } catch (err) {
      console.error(
        "[unlock] Stripe email lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return {
        ok: false,
        error:
          "We could not check purchases right now. Try again in a minute, or email support@jeffsebiz.com with the receipt email you got when you paid.",
      };
    }

    if (!found) return { ok: false, error: NO_PURCHASE_MESSAGE };
    try {
      return { ok: true, product: await saveUnlock(found) };
    } catch (err) {
      console.error("[unlock] could not save unlock cookie:", err);
      return {
        ok: false,
        error:
          "We found your purchase but could not open it on this device. Email support@jeffsebiz.com with the receipt email you got when you paid.",
      };
    }
  });
