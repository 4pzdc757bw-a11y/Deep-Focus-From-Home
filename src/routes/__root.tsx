import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/app-shell";
import { LockScreen, useUnlockedProduct } from "@/components/lock-screen";
import { hasAccess, requiredAccessForPath } from "@/lib/unlock/access";
import { getUnlockStatus } from "@/lib/unlock/unlock";
import appCss from "../styles.css?url";

const APP_NAME = "Deep Focus from Home";

/** Paywall: render the lock screen instead of a page this device has not unlocked. */
function GatedOutlet() {
  // Path of the page actually being rendered (leaf match).
  const pathname = useRouterState({
    select: (s) => s.matches[s.matches.length - 1]?.pathname ?? s.location.pathname,
  });
  const product = useUnlockedProduct();
  const need = requiredAccessForPath(pathname);
  if (need === "none" || hasAccess(product, need)) return <Outlet />;
  return <LockScreen need={need} />;
}

export const Route = createRootRoute({
  // Server-verified unlock (signed httpOnly cookie). Runs on the server for the
  // first page load, so locked pages are never rendered into the HTML.
  loader: () => getUnlockStatus(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#3A4A32" },
      {
        name: "description",
        content:
          "A practical focus system for remote workers. Daily OS, 7-day starter, energy log, and the full guide — runs in your web browser.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-sage text-ink">
        <PreviewHostBridge />
        <AuthProvider>
          <AppShell>
            <GatedOutlet />
          </AppShell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
