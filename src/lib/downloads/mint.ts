import { createServerFn } from "@tanstack/react-start";
import {
  DOWNLOAD_FILE_KEYS,
  DOWNLOAD_FILE_LIST,
  isDownloadFileKey,
  type DownloadFileKey,
} from "./catalog";
import { DownloadAuthError, downloadErrorMessage, downloadErrorStatus } from "./errors";

export type MintedDownloadLink = {
  key: DownloadFileKey;
  label: string;
  url: string;
  expiresAt: number;
};

export { downloadErrorMessage, downloadErrorStatus };

function parseSessionId(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new DownloadAuthError(
      "Missing checkout session id. Open this page from your Stripe payment confirmation, or email support@jeffsebiz.com with your receipt.",
    );
  }
  return raw.trim();
}

function parseFileKeys(raw: unknown): DownloadFileKey[] {
  if (raw == null) return [...DOWNLOAD_FILE_KEYS];
  if (!Array.isArray(raw)) {
    throw new DownloadAuthError("Invalid file list.");
  }
  const keys: DownloadFileKey[] = [];
  for (const item of raw) {
    if (!isDownloadFileKey(item)) {
      throw new DownloadAuthError("Unknown download file requested.");
    }
    keys.push(item);
  }
  return keys.length > 0 ? keys : [...DOWNLOAD_FILE_KEYS];
}

/**
 * Verify a Stripe Checkout Session, then mint short-lived signed download URLs.
 * Fail closed when STRIPE_SECRET_KEY is unset (no public file leak).
 *
 * Server-only modules are loaded inside the handler so this file stays safe to
 * import from React components (createServerFn client stub).
 */
export const mintPaidDownloadUrls = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = (input ?? {}) as {
      sessionId?: unknown;
      files?: unknown;
    };
    return {
      sessionId: parseSessionId(data.sessionId),
      files: parseFileKeys(data.files),
    };
  })
  .handler(async ({ data }): Promise<{ links: MintedDownloadLink[] }> => {
    const { assertPaidCheckoutSession } = await import("./stripe.server");
    const {
      buildSignedDownloadPath,
      mintSignedDownloadParams,
    } = await import("./signing.server");

    await assertPaidCheckoutSession(data.sessionId);

    const links: MintedDownloadLink[] = data.files.map((key) => {
      const meta = DOWNLOAD_FILE_LIST.find((f) => f.key === key)!;
      const signed = mintSignedDownloadParams(key);
      return {
        key,
        label: meta.label,
        url: buildSignedDownloadPath(signed),
        expiresAt: signed.exp,
      };
    });

    return { links };
  });
