import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/app-shell";
import { InstallCard } from "@/components/install-card";
import { LegalFooter } from "@/components/legal-footer";
import { Button } from "@/components/ui/button";
import {
  DOWNLOAD_FILE_LIST,
  DOWNLOAD_SUPPORT_EMAIL,
  type DownloadFileKey,
} from "@/lib/downloads/catalog";
import {
  downloadErrorMessage,
  mintPaidDownloadUrls,
  type MintedDownloadLink,
} from "@/lib/downloads/mint";
import {
  APP_PRICE_LABEL,
  getPurchasedProduct,
  markPurchased,
  parsePurchaseProduct,
  PRICE_LABEL,
  type PurchaseProduct,
} from "@/lib/offer";
import { useFocusStore } from "@/lib/store";

type ThanksSearch = {
  /** Raw search value — TanStack JSON-parses `?paid=1` as number 1. */
  paid?: string | number | boolean;
  product?: PurchaseProduct;
  /** Stripe Checkout Session id from `{CHECKOUT_SESSION_ID}` success URL. */
  session_id?: string;
};

/**
 * Keep the original parsed value so validateSearch does not rewrite search
 * (rewrite → server 307 that previously stripped unlock when paid was number 1).
 */
function keepPaidParam(raw: unknown): ThanksSearch["paid"] | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (
    typeof raw === "string" ||
    typeof raw === "number" ||
    typeof raw === "boolean"
  ) {
    return raw;
  }
  return undefined;
}

function keepSessionId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

function isPaidUnlock(paid: ThanksSearch["paid"]): boolean {
  return paid === 1 || paid === "1" || paid === true || paid === "true";
}

export const Route = createFileRoute("/thanks")({
  validateSearch: (search: Record<string, unknown>): ThanksSearch => {
    const paid = keepPaidParam(search.paid);
    const product = parsePurchaseProduct(search.product);
    const session_id = keepSessionId(search.session_id);
    const out: ThanksSearch = {};
    if (paid !== undefined) out.paid = paid;
    if (product) out.product = product;
    if (session_id) out.session_id = session_id;
    return out;
  },
  component: ThanksPage,
});

function sessionDownloadHref(sessionId: string, key: DownloadFileKey): string {
  const q = new URLSearchParams({
    session_id: sessionId,
    file: key,
  });
  return `/api/download?${q.toString()}`;
}

function HandbookDownloadButtons({
  sessionId,
}: {
  sessionId: string | undefined;
}) {
  const [links, setLinks] = useState<MintedDownloadLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLinks(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void mintPaidDownloadUrls({ data: { sessionId } })
      .then((result) => {
        if (cancelled) return;
        setLinks(result.links);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Session links still work as a fallback if minting fails (e.g. signing).
        setLinks(null);
        setError(downloadErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const items = useMemo(() => {
    if (links && links.length > 0) {
      return links.map((link) => ({
        key: link.key,
        href: link.url,
        label: link.label,
      }));
    }
    if (sessionId) {
      return DOWNLOAD_FILE_LIST.map((meta) => ({
        key: meta.key,
        href: sessionDownloadHref(sessionId, meta.key),
        label: meta.label,
      }));
    }
    return [];
  }, [links, sessionId]);

  if (!sessionId) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-gold/30 bg-cream/40 p-4 text-ink">
        <p className="font-medium">Downloads need your checkout link</p>
        <p className="text-sm">
          This page was opened without a Stripe checkout session id, so we cannot
          unlock the paid handbook files here. Email{" "}
          <a
            className="underline underline-offset-2"
            href={`mailto:${DOWNLOAD_SUPPORT_EMAIL}?subject=Deep%20Focus%20handbook%20download`}
          >
            {DOWNLOAD_SUPPORT_EMAIL}
          </a>{" "}
          with your Stripe receipt and we will send your files.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {loading && (
        <p className="text-sm text-muted">Preparing secure download links…</p>
      )}
      {error && !loading && (
        <p className="text-sm text-muted">
          {error} You can still try the buttons below — each click re-checks your
          payment with Stripe.
        </p>
      )}
      {items.map((item) => (
        <Button key={item.key} variant="outline" asChild>
          <a href={item.href}>
            <Download className="size-4" /> {item.label}
          </a>
        </Button>
      ))}
      <p className="text-xs text-muted">
        Links expire in about 30 minutes. Refresh this page to get new ones, or
        email {DOWNLOAD_SUPPORT_EMAIL} with your receipt if you need help.
      </p>
    </div>
  );
}

function ThanksPage() {
  const {
    paid,
    product: productParam,
    session_id: sessionId,
  } = Route.useSearch();
  const start = useFocusStore((s) => s.startStarter);
  const fromCheckout = isPaidUnlock(paid);
  const product: PurchaseProduct | null =
    productParam ?? (fromCheckout ? getPurchasedProduct() : null);
  const isAppBuyer = fromCheckout && product === "app";

  useEffect(() => {
    if (!fromCheckout) return;
    markPurchased(productParam ?? product ?? undefined);
    start();
  }, [fromCheckout, productParam, product, start]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        {fromCheckout
          ? isAppBuyer
            ? "Payment received — open the app"
            : "Payment received — start Day 1"
          : "You’re in — start Day 1"}
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive">
        {fromCheckout ? "Thank you — you’re in." : "The pack is yours."}
      </h1>
      <p className="max-w-prose text-lg text-ink">
        {fromCheckout
          ? isAppBuyer
            ? "Your app is unlocked on this device. Open Day 1, then install to your home screen so the Daily OS stays with you."
            : "Your handbook and fillables are ready below. Do only Day 1 today: claim one work-only surface and park the phone for the first deep-work block."
          : "Do only Day 1 today: claim one work-only surface and park the phone for the first deep-work block (use the app to start, then phone off the desk). That is the whole job."}
      </p>

      {isAppBuyer ? (
        <>
          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Your app access
            </p>
            <h2 className="font-display text-2xl text-olive">
              Start Day 1 in the app
            </h2>
            <p className="text-ink">
              Claim one work-only surface. Park the phone for the first deep-work
              block. That is the whole job for today.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link to="/starter" onClick={() => start()}>
                  Open Day 1 <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Go to Today</Link>
              </Button>
            </div>
          </Card>
          <InstallCard />
          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Also included — handbook
            </p>
            <h2 className="font-display text-xl text-olive">
              Download PDFs and fillables
            </h2>
            <p className="text-ink">
              Secondary to the app. Keep the Stripe receipt email — that is your
              proof of purchase.
            </p>
            <HandbookDownloadButtons sessionId={sessionId} />
          </Card>
        </>
      ) : (
        <>
          {fromCheckout && (
            <Card className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Your handbook access
              </p>
              <h2 className="font-display text-2xl text-olive">
                Download Deep Focus from Home
              </h2>
              <p className="text-ink">
                Phone PDF, desktop PDF, and every fillable worksheet. Keep the
                Stripe receipt email — that is your proof of purchase.
              </p>
              <HandbookDownloadButtons sessionId={sessionId} />
            </Card>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/starter" onClick={() => start()}>
                Open Day 1 in the app <ArrowRight className="size-4" />
              </Link>
            </Button>
            {!fromCheckout && (
              <Button variant="outline" asChild>
                <a href="/downloads/7-day-starter-pack.pdf" download>
                  Download the PDF backup
                </a>
              </Button>
            )}
          </div>
          <p className="text-sm text-muted">
            {fromCheckout
              ? "Purchase unlock is marked on this device. Want the installable app? See the app offer on the buy page."
              : "The free pack is week one. The PDF is if you want it on paper."}
          </p>
        </>
      )}

      {!fromCheckout && (
        <>
          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Handbook
            </p>
            <h2 className="font-display text-2xl text-olive">
              Handbook + fillables. {PRICE_LABEL}.
            </h2>
            <p className="text-ink">
              The pack is week one. The full handbook and every fillable form —
              daily OS, energy log, setup, weekly planner, household agreement,
              monthly review — are {PRICE_LABEL}, pay once.
            </p>
            <div>
              <Button asChild>
                <Link to="/buy">Get the {PRICE_LABEL} handbook</Link>
              </Button>
            </div>
            <p className="text-sm text-muted">No webinar. Keep it if Day 1 already helped.</p>
          </Card>

          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              The app
            </p>
            <h2 className="font-display text-2xl text-olive">
              Run it on your phone. {APP_PRICE_LABEL}.
            </h2>
            <p className="text-ink">
              The installable app (Daily OS, starter week, bell, energy peak,
              household fridge copy), plus handbook downloads. One-time{" "}
              {APP_PRICE_LABEL}.
            </p>
            <div>
              <Button variant="outline" asChild>
                <Link to="/buy">See the {APP_PRICE_LABEL} app</Link>
              </Button>
            </div>
          </Card>
        </>
      )}
      <LegalFooter />
    </div>
  );
}
