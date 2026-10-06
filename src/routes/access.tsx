import { createFileRoute, redirect } from "@tanstack/react-router";
import { parsePurchaseProduct } from "@/lib/offer";

type AccessSearch = {
  product?: "handbook" | "app";
  /** Stripe Checkout Session id from Payment Link `{CHECKOUT_SESSION_ID}`. */
  session_id?: string;
};

function keepSessionId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

/**
 * Durable post-pay landing for Stripe Payment Link success URL.
 * Prefer:
 *   https://deepfocusfromhome.com/access?product=handbook&session_id={CHECKOUT_SESSION_ID}
 *   https://deepfocusfromhome.com/access?product=app&session_id={CHECKOUT_SESSION_ID}
 * (or the /thanks equivalents). The session id unlocks signed handbook downloads.
 */
export const Route = createFileRoute("/access")({
  validateSearch: (search: Record<string, unknown>): AccessSearch => {
    const product = parsePurchaseProduct(search.product);
    const session_id = keepSessionId(search.session_id);
    const out: AccessSearch = {};
    if (product) out.product = product;
    if (session_id) out.session_id = session_id;
    return out;
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/thanks",
      search: {
        paid: 1,
        ...(search.product ? { product: search.product } : {}),
        ...(search.session_id ? { session_id: search.session_id } : {}),
      },
      replace: true,
    });
  },
});
