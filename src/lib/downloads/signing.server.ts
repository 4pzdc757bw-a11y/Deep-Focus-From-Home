import { createHmac, timingSafeEqual } from "node:crypto";
import { isDownloadFileKey, type DownloadFileKey } from "./catalog.ts";
import { DownloadAuthError, DownloadConfigError } from "./errors.ts";

export { DownloadAuthError, DownloadConfigError } from "./errors.ts";

/** Signed download links expire after 30 minutes (within 15–60 launch window). */
export const DOWNLOAD_LINK_TTL_SECONDS = 30 * 60;

/**
 * HMAC secret for signed download URLs.
 * Prefer DOWNLOAD_SIGNING_SECRET; otherwise derive from STRIPE_SECRET_KEY
 * so we never invent a second secret in chat.
 */
export function getDownloadSigningSecret(): string {
  const explicit = (process.env.DOWNLOAD_SIGNING_SECRET ?? "").trim();
  if (explicit) return explicit;

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (stripeKey) {
    return createHmac("sha256", "deep-focus-download-v1")
      .update(stripeKey)
      .digest("hex");
  }

  throw new DownloadConfigError(
    "Download signing is not configured. Set STRIPE_SECRET_KEY (and optionally DOWNLOAD_SIGNING_SECRET) in Vercel env.",
  );
}

function base64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: string, secret: string): string {
  return base64Url(createHmac("sha256", secret).update(payload).digest());
}

export type SignedDownloadParams = {
  file: DownloadFileKey;
  exp: number;
  sig: string;
};

export function mintSignedDownloadParams(
  file: DownloadFileKey,
  ttlSeconds: number = DOWNLOAD_LINK_TTL_SECONDS,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SignedDownloadParams {
  const secret = getDownloadSigningSecret();
  const exp = nowSeconds + ttlSeconds;
  const payload = `${file}.${exp}`;
  const sig = signPayload(payload, secret);
  return { file, exp, sig };
}

export function buildSignedDownloadPath(params: SignedDownloadParams): string {
  const q = new URLSearchParams({
    file: params.file,
    exp: String(params.exp),
    sig: params.sig,
  });
  return `/api/download?${q.toString()}`;
}

export function verifySignedDownloadParams(input: {
  file: string;
  exp: string | number;
  sig: string;
  nowSeconds?: number;
}): DownloadFileKey {
  if (!isDownloadFileKey(input.file)) {
    throw new DownloadAuthError("Unknown download file.");
  }

  const exp =
    typeof input.exp === "number"
      ? input.exp
      : Number.parseInt(String(input.exp), 10);
  if (!Number.isFinite(exp) || exp <= 0) {
    throw new DownloadAuthError("Invalid or missing download expiry.");
  }

  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (exp < now) {
    throw new DownloadAuthError(
      "This download link has expired. Refresh the thanks page or email support@jeffsebiz.com with the receipt email you got when you paid.",
    );
  }

  let secret: string;
  try {
    secret = getDownloadSigningSecret();
  } catch (err) {
    if (err instanceof DownloadConfigError) throw err;
    throw new DownloadConfigError("Download signing is not configured.");
  }

  const payload = `${input.file}.${exp}`;
  const expected = signPayload(payload, secret);
  const got = String(input.sig ?? "");
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new DownloadAuthError("Invalid download signature.");
  }

  return input.file;
}
