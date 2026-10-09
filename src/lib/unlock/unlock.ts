import { createServerFn } from "@tanstack/react-start";
import type { CheckoutSessionsApi } from "../downloads/stripe.server";
import type { UnlockProduct } from "./access";
import {
  NO_PURCHASE_MESSAGE,
  type StartUpgradeResult,
  type UnlockByEmailResult,
  UPGRADE_NO_HANDBOOK_MESSAGE,
} from "./unlock-result";

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
    const { sessionKind } = await import("./product.server");
    // assertPaidCheckoutSession already checked that a $20 upgrade has a
    // paid, unrefunded handbook on the same email (#108).
    const { session } = await assertPaidCheckoutSession(data.sessionId);
    const kind = sessionKind(session, { strict: false });
    const product = kind === "upgrade" ? "app" : kind;
    if (!product) {
      throw new Error(
        "We could not match this payment to a Deep Focus product. Email support@deepfocusfromhome.com with the receipt email you got when you paid.",
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

    const { stripeClient, grantingSessionsForEmail } = await import(
      "../downloads/stripe.server"
    );
    const { combineSessionKinds } = await import("./product.server");

    let found: UnlockProduct | null = null;
    try {
      // Paid, unrefunded checkouts for this email (lowercased and as typed).
      // The $20 upgrade counts as the app only next to a valid handbook (#108).
      const sessions = await grantingSessionsForEmail(
        stripeClient() as unknown as CheckoutSessionsApi,
        data.typed,
      );
      found = combineSessionKinds(sessions.map((s) => s.kind));
    } catch (err) {
      console.error(
        "[unlock] Stripe email lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return {
        ok: false,
        error:
          "We could not check purchases right now. Try again in a minute, or email support@deepfocusfromhome.com with the receipt email you got when you paid.",
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
          "We found your purchase but could not open it on this device. Email support@deepfocusfromhome.com with the receipt email you got when you paid.",
      };
    }
  });

/**
 * #108: start the $20 app upgrade for handbook buyers.
 *
 * Only a device with the handbook unlocked can ask, and only for an email
 * with a paid, unrefunded $17 handbook purchase. The upgrade Payment Link
 * lives on the server and is handed out with that buyer's email locked in
 * checkout. After payment the upgrade is checked again (same email, handbook
 * still not refunded) before the app opens.
 */
export const startAppUpgrade = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as { email?: unknown };
    const typed = typeof raw.email === "string" ? raw.email.trim().slice(0, 300) : "";
    return { email: typed.toLowerCase(), typed };
  })
  .handler(async ({ data }): Promise<StartUpgradeResult> => {
    if (
      !data.email ||
      data.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return { ok: false, error: "Enter the email you used to buy the handbook." };
    }
    const current = await readCookieProduct().catch(() => null);
    if (current === "app") {
      return { ok: true, action: "unlocked", product: "app" };
    }
    if (current !== "handbook") {
      return {
        ok: false,
        error: "Unlock your handbook on this device first, then try the upgrade again.",
      };
    }

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { rateLimitHit } = await import("./rate-limit.server");
    const ip =
      (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown";
    const tenMinutes = 10 * 60 * 1000;
    if (
      rateLimitHit(`upgrade-ip:${ip}`, 8, tenMinutes) ||
      rateLimitHit(`upgrade-email:${data.email}`, 5, tenMinutes)
    ) {
      return { ok: false, error: "Too many tries. Wait 10 minutes and try again." };
    }

    const { stripeClient, grantingSessionsForEmail } = await import(
      "../downloads/stripe.server"
    );
    const { combineSessionKinds } = await import("./product.server");
    const { appUpgradeCheckoutUrl } = await import("./upgrade.server");

    let sessions: Awaited<ReturnType<typeof grantingSessionsForEmail>>;
    try {
      sessions = await grantingSessionsForEmail(
        stripeClient() as unknown as CheckoutSessionsApi,
        data.typed,
      );
    } catch (err) {
      console.error(
        "[upgrade] Stripe lookup failed:",
        err instanceof Error ? err.message : err,
      );
      return {
        ok: false,
        error:
          "We could not check your handbook purchase right now. Try again in a minute, or email support@deepfocusfromhome.com.",
      };
    }

    // Already owns the app (full price, or an earlier upgrade): just open it.
    if (combineSessionKinds(sessions.map((s) => s.kind)) === "app") {
      return { ok: true, action: "unlocked", product: await saveUnlock("app") };
    }
    const handbook = sessions.find((s) => s.kind === "handbook")?.session;
    if (!handbook) return { ok: false, error: UPGRADE_NO_HANDBOOK_MESSAGE };

    const buyerEmail = (
      handbook.customer_details?.email ??
      handbook.customer_email ??
      data.typed
    ).trim();
    const url = appUpgradeCheckoutUrl({
      email: buyerEmail,
      handbookSessionId: handbook.id,
    });
    if (!url) {
      return {
        ok: false,
        error:
          "The upgrade isn't available right now. Email support@deepfocusfromhome.com and we'll help.",
      };
    }
    return { ok: true, action: "checkout", url };
  });
