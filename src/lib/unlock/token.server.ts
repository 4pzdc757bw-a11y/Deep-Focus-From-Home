import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed device-unlock token (stored in an httpOnly cookie).
 * Format: v1.<base64url JSON payload>.<base64url HMAC-SHA256>
 */

export type UnlockTokenProduct = "handbook" | "app";

export type UnlockTokenPayload = {
  /** Product unlocked on this device. */
  p: UnlockTokenProduct;
  /** Issued at (unix seconds). */
  iat: number;
  /** Expires at (unix seconds). */
  exp: number;
};

export const UNLOCK_COOKIE_NAME = "df_unlock";
/** Browsers cap cookie lifetime at ~400 days. */
export const UNLOCK_TTL_SECONDS = 400 * 24 * 60 * 60;

export class UnlockConfigError extends Error {
  readonly code = "unlock_config" as const;
  constructor(message: string) {
    super(message);
    this.name = "UnlockConfigError";
  }
}

/**
 * HMAC secret for unlock tokens. Prefer UNLOCK_SECRET; otherwise derive one
 * from STRIPE_SECRET_KEY (same pattern as signed downloads, different label,
 * so the two signatures are never interchangeable).
 */
export function getUnlockSecret(): string {
  const explicit = (process.env.UNLOCK_SECRET ?? "").trim();
  if (explicit) return explicit;
  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (stripeKey) {
    return createHmac("sha256", "deep-focus-unlock-v1")
      .update(stripeKey)
      .digest("hex");
  }
  throw new UnlockConfigError(
    "Unlock is not configured on this server (STRIPE_SECRET_KEY is missing).",
  );
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(norm + "=".repeat((4 - (norm.length % 4)) % 4), "base64");
}

function sign(data: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

export function mintUnlockToken(
  product: UnlockTokenProduct,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  ttlSeconds: number = UNLOCK_TTL_SECONDS,
): string {
  const secret = getUnlockSecret();
  const payload: UnlockTokenPayload = {
    p: product,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const data = `v1.${body}`;
  return `${data}.${sign(data, secret)}`;
}

/** Returns the payload, or null for anything missing/tampered/expired. */
export function verifyUnlockToken(
  token: string | null | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): UnlockTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  let secret: string;
  try {
    secret = getUnlockSecret();
  } catch {
    return null;
  }
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret));
  const got = Buffer.from(parts[2] ?? "");
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromB64url(parts[1]!).toString("utf8")) as
      | Partial<UnlockTokenPayload>
      | null;
    if (!payload || (payload.p !== "app" && payload.p !== "handbook")) {
      return null;
    }
    if (typeof payload.exp !== "number" || payload.exp < nowSeconds) return null;
    return {
      p: payload.p,
      iat: Number(payload.iat) || 0,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
