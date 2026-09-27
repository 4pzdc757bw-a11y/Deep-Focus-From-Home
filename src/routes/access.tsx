import { createFileRoute, redirect } from "@tanstack/react-router";
import { parsePurchaseProduct } from "@/lib/offer";

type AccessSearch = {
  product?: "handbook" | "app";
};

/**
 * Durable post-pay landing for Stripe Payment Link success URL.
 * Prefer https://deepfocus.jeffsebiz.com/access?product=app|handbook
 * over query-only unlock.
 */
export const Route = createFileRoute("/access")({
  validateSearch: (search: Record<string, unknown>): AccessSearch => {
    const product = parsePurchaseProduct(search.product);
    return product ? { product } : {};
  },
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/thanks",
      search: {
        paid: 1,
        ...(search.product ? { product: search.product } : {}),
      },
      replace: true,
    });
  },
});
