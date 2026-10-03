import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/app-shell";
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
  getPurchasedProduct,
  markPurchased,
  parsePurchaseProduct,
  PRICE_LABEL,
  type PurchaseProduct,
  APP_ACCESS_LINE,
} from "@/lib/offer";
import { useFocusStore } from "@/lib/store";
import type { UnlockProduct } from "@/lib/unlock/access";
import { unlockFromCheckoutSession } from "@/lib/unlock/unlock";

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
          We couldn’t match this page to your payment, so we can’t open the
          handbook files here. Email{" "}
          <a
            className="underline underline-offset-2"
            href={`mailto:${DOWNLOAD_SUPPORT_EMAIL}?subject=Deep%20Focus%20handbook%20download`}
          >
            {DOWNLOAD_SUPPORT_EMAIL}
          </a>{" "}
          with the receipt email you got when you paid, and we will send your files.
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
          payment.
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

type DeviceUnlock =
  | { state: "idle" }
  | { state: "working" }
  | { state: "done"; product: UnlockProduct }
  | { state: "error"; message: string };

/** Verify the Stripe session server-side and save the signed unlock cookie. */
function useCheckoutUnlock(sessionId: string | undefined): DeviceUnlock {
  const router = useRouter();
  const [status, setStatus] = useState<DeviceUnlock>({ state: "idle" });

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setStatus({ state: "working" });
    void unlockFromCheckoutSession({ data: { sessionId } })
      .then(async (result) => {
        if (cancelled || !result.product) return;
        setStatus({ state: "done", product: result.product });
        await router.invalidate();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus({ state: "error", message: downloadErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return status;
}

function DeviceUnlockNote({ status }: { status: DeviceUnlock }) {
  if (status.state === "idle") return null;
  if (status.state === "working") {
    return <p className="text-sm text-muted">Checking your payment…</p>;
  }
  if (status.state === "done") {
    return (
      <p className="text-sm font-semibold text-olive">
        {status.product === "app"
          ? "The app is open on this device."
          : "The full handbook is open on this device."}{" "}
        On another phone or computer, tap “Already bought? Get your copy” and type the email you paid with.
      </p>
    );
  }
  return (
    <p role="alert" className="text-sm text-ink">
      {status.message} You can also unlock with your checkout email on any locked page.
    </p>
  );
}

function ThanksPage() {
  const {
    paid,
    product: productParam,
    session_id: sessionId,
  } = Route.useSearch();
  const start = useFocusStore((s) => s.startStarter);
  const unlock = useCheckoutUnlock(sessionId);
  const fromCheckout = isPaidUnlock(paid) || unlock.state === "done";
  const verifiedProduct = unlock.state === "done" ? unlock.product : null;
  const product: PurchaseProduct | null =
    verifiedProduct ?? productParam ?? (fromCheckout ? getPurchasedProduct() : null);
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
            ? "Open Day 1 now. The app runs in your web browser — bookmark this site so the Daily OS is one tap away."
            : "Your handbook and fillables are ready below. Do only Day 1 today: claim one work-only surface and park the phone for the first deep-work block."
          : "Do only Day 1 today: claim one work-only surface and park the phone off the desk for the first deep-work block. That is the whole job."}
      </p>
      <DeviceUnlockNote status={unlock} />

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
            <p className="text-sm text-muted">
              {APP_ACCESS_LINE} The app runs in your web browser; use Print this
              day / Save PDF to keep your own copy of your entries.
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
          <Card className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Also included — handbook
            </p>
            <h2 className="font-display text-xl text-olive">
              Download PDFs and fillables
            </h2>
            <p className="text-ink">
              Keep the receipt email you got when you paid — that is your
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
                receipt email you got when you paid — that is your proof of purchase.
              </p>
              <HandbookDownloadButtons sessionId={sessionId} />
            </Card>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link to="/starter" onClick={() => start()}>
                {fromCheckout ? "Open Day 1 of the starter week" : "Open the 7-day starter"}{" "}
                <ArrowRight className="size-4" />
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
              ? "Read one handbook chapter at a time and do its action this week."
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

        </>
      )}
      <LegalFooter />
    </div>
  );
}
