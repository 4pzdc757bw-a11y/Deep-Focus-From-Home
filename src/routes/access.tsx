import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Durable post-pay landing for Stripe Payment Link success URL.
 * Prefer https://deepfocus.jeffsebiz.com/access over query-only unlock.
 */
export const Route = createFileRoute("/access")({
  beforeLoad: () => {
    throw redirect({
      to: "/thanks",
      search: { paid: 1 },
      replace: true,
    });
  },
});
