import {
  grantingSessionsForEmail,
  type CheckoutSessionsApi,
} from "./stripe.server.ts";
import { combineSessionKinds } from "../unlock/product.server.ts";
import { DOWNLOAD_FILE_LIST } from "./catalog.ts";
import {
  buildSignedDownloadPath,
  mintSignedDownloadParams,
} from "./signing.server.ts";
import type { MyDownloadsResult } from "./my-downloads-result.ts";
import {
  DOWNLOADS_EMAIL_SUBJECT,
  SITE_ORIGIN,
  buildDownloadsEmailText,
  sendWithResend,
  type SendEmailFn,
} from "./email.server.ts";

/**
 * Shown for EVERY submitted email, purchase or not. Never says whether the
 * email has a purchase.
 */
export const MY_DOWNLOADS_SENT_MESSAGE =
  "If that email has a purchase, we've sent your download links.";

/** Every response takes at least this long, so timing doesn't reveal a purchase. */
export const MY_DOWNLOADS_MIN_RESPONSE_MS = 2000;

export const MY_DOWNLOADS_BAD_EMAIL_MESSAGE =
  "Enter the email you paid with.";

export const MY_DOWNLOADS_BUSY_MESSAGE =
  "Too many tries. Wait 10 minutes and try again.";

export const MY_DOWNLOADS_UNAVAILABLE_MESSAGE =
  "We couldn't check right now. Try again in a minute, or email support@deepfocusfromhome.com.";

/**
 * "My downloads": a paid, not fully refunded handbook or app purchase (the $20
 * upgrade counts only next to a valid handbook) gets fresh signed links by
 * email. Links are never returned to the browser. Refunded or unknown emails
 * get the identical on-screen message and no email.
 */
export async function myDownloadsForEmail(
  stripe: CheckoutSessionsApi,
  typedEmail: string,
  send: SendEmailFn = sendWithResend,
  minResponseMs: number = MY_DOWNLOADS_MIN_RESPONSE_MS,
): Promise<MyDownloadsResult> {
  const started = Date.now();
  const result = await lookupAndSend(stripe, typedEmail, send);
  const wait = minResponseMs - (Date.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  return result;
}

async function lookupAndSend(
  stripe: CheckoutSessionsApi,
  typedEmail: string,
  send: SendEmailFn,
): Promise<MyDownloadsResult> {
  let sessions: Awaited<ReturnType<typeof grantingSessionsForEmail>>;
  try {
    sessions = await grantingSessionsForEmail(stripe, typedEmail);
  } catch (err) {
    console.error(
      "[my-downloads] Stripe email lookup failed:",
      err instanceof Error ? err.message : err,
    );
    return { ok: false, error: MY_DOWNLOADS_UNAVAILABLE_MESSAGE };
  }
  if (!combineSessionKinds(sessions.map((s) => s.kind))) {
    return { ok: true, message: MY_DOWNLOADS_SENT_MESSAGE };
  }
  try {
    const links = DOWNLOAD_FILE_LIST.map((meta) => ({
      label: meta.label,
      url: `${SITE_ORIGIN}${buildSignedDownloadPath(mintSignedDownloadParams(meta.key))}`,
    }));
    await send({
      to: typedEmail,
      subject: DOWNLOADS_EMAIL_SUBJECT,
      text: buildDownloadsEmailText(links),
    });
  } catch (err) {
    // Same on-screen message either way, so a failure can't reveal a purchase.
    console.error(
      "[my-downloads] Sending links email failed:",
      err instanceof Error ? err.message : err,
    );
  }
  return { ok: true, message: MY_DOWNLOADS_SENT_MESSAGE };
}
