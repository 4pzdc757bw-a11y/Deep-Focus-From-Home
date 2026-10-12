import { createServerFn } from "@tanstack/react-start";
import type { MyDownloadsResult } from "./my-downloads-result";

export type { MyDownloadsResult };

/**
 * "My downloads": a buyer types the email they paid with and gets fresh
 * download links. Server-only modules load inside the handler so this file is
 * safe to import from React components.
 */
export const getMyDownloads = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw = (input ?? {}) as { email?: unknown };
    const typed =
      typeof raw.email === "string" ? raw.email.trim().slice(0, 300) : "";
    return { email: typed.toLowerCase(), typed };
  })
  .handler(async ({ data }): Promise<MyDownloadsResult> => {
    const {
      MY_DOWNLOADS_BAD_EMAIL_MESSAGE,
      MY_DOWNLOADS_BUSY_MESSAGE,
      myDownloadsForEmail,
    } = await import("./my-downloads.server");
    if (
      !data.email ||
      data.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      return { ok: false, error: MY_DOWNLOADS_BAD_EMAIL_MESSAGE };
    }
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { rateLimitHit } = await import("../unlock/rate-limit.server");
    const ip =
      (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown";
    const tenMinutes = 10 * 60 * 1000;
    if (
      rateLimitHit(`downloads-ip:${ip}`, 8, tenMinutes) ||
      rateLimitHit(`downloads-email:${data.email}`, 3, tenMinutes)
    ) {
      return { ok: false, error: MY_DOWNLOADS_BUSY_MESSAGE };
    }
    const { stripeClient } = await import("./stripe.server");
    return myDownloadsForEmail(
      stripeClient() as unknown as import("./stripe.server").CheckoutSessionsApi,
      data.typed,
    );
  });
