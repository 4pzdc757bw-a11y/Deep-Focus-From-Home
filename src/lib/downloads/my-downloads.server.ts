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

/** Shown for any email we can't match; never says whether the email exists. */
export const MY_DOWNLOADS_NOT_FOUND_MESSAGE =
  "We couldn't find a paid purchase for that email. Email support@deepfocusfromhome.com and we'll help.";

export const MY_DOWNLOADS_BAD_EMAIL_MESSAGE =
  "Enter the email you paid with.";

export const MY_DOWNLOADS_BUSY_MESSAGE =
  "Too many tries. Wait 10 minutes and try again.";

export const MY_DOWNLOADS_UNAVAILABLE_MESSAGE =
  "We couldn't check right now. Try again in a minute, or email support@deepfocusfromhome.com.";

/**
 * Fresh signed links for a buyer's email. Same rules as "Already bought?
 * Unlock this device": a paid, not fully refunded handbook or app purchase
 * (the $20 upgrade counts only next to a valid handbook). Refunded or unknown
 * emails get the same neutral message and no links.
 */
export async function myDownloadsForEmail(
  stripe: CheckoutSessionsApi,
  typedEmail: string,
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
    return { ok: false, error: MY_DOWNLOADS_NOT_FOUND_MESSAGE };
  }
  const links = DOWNLOAD_FILE_LIST.map((meta) => {
    const signed = mintSignedDownloadParams(meta.key);
    return {
      key: meta.key,
      label: meta.label,
      url: buildSignedDownloadPath(signed),
      expiresAt: signed.exp,
    };
  });
  return { ok: true, links };
}
