import { getRouteApi, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ACCESS_LINE, APP_PRICE_LABEL, PRICE_LABEL } from "@/lib/offer";
import { hasAccess, type AccessNeed, type UnlockProduct } from "@/lib/unlock/access";
import { unlockByEmail } from "@/lib/unlock/unlock";
import { NotReadyLinks } from "@/components/not-ready";
import { readUnlockResult, unlockErrorText } from "@/lib/unlock/unlock-result";

const rootApi = getRouteApi("__root__");

/** Product unlocked on this device (server-verified cookie, via the root loader). */
export function useUnlockedProduct(): UnlockProduct | null {
  const data = rootApi.useLoaderData() as { product?: UnlockProduct | null } | undefined;
  return data?.product ?? null;
}

export function useHasAccess(need: AccessNeed): boolean {
  return hasAccess(useUnlockedProduct(), need);
}

const HANDBOOK_SEEN_KEY = "df-handbook-unlocked-at";
/** Handbook buyers see no app pitch for this long after their unlock (7 days). */
export const APP_PITCH_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * When the handbook was unlocked on this device (ms): the earlier of the
 * signed token's issued-at and the first time this browser saw the unlock.
 * Null until known on the client (so nothing is pitched during SSR).
 */
export function useHandbookUnlockedAt(): number | null {
  const data = rootApi.useLoaderData() as
    | { product?: UnlockProduct | null; unlockedAt?: number | null }
    | undefined;
  const product = data?.product ?? null;
  const tokenAt = data?.unlockedAt ?? null;
  const [seenAt, setSeenAt] = useState<number | null>(null);
  useEffect(() => {
    if (product !== "handbook") return;
    try {
      let at = Number(window.localStorage.getItem(HANDBOOK_SEEN_KEY));
      if (!Number.isFinite(at) || at <= 0) {
        at = Date.now();
        window.localStorage.setItem(HANDBOOK_SEEN_KEY, String(at));
      }
      setSeenAt(at);
    } catch {
      setSeenAt(Date.now());
    }
  }, [product]);
  if (product !== "handbook" || seenAt == null) return null;
  return tokenAt ? Math.min(tokenAt, seenAt) : seenAt;
}

/** Handbook-only buyer whose unlock is at least 7 days old. */
export function useAppPitchAllowed(now = Date.now()): boolean {
  const at = useHandbookUnlockedAt();
  return at != null && now - at >= APP_PITCH_DELAY_MS;
}

/** Plain-language name of the app tool on `pathname`, for lock headings. */
export function toolNameForPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, "") || "/";
  const names: Record<string, string> = {
    "/": "Today’s planner",
    "/daily": "The daily planner",
    "/starter": "The 7-day starter",
    "/week": "The weekly planner",
    "/month": "The monthly review",
    "/energy": "The energy log",
    "/household": "The household agreement",
    "/setup": "Home focus setup",
  };
  return names[p] ?? "This tool";
}

/**
 * Last attempt, kept outside React so the email and message survive if the
 * lock screen re-mounts (route change, loader refresh) right after a failed try.
 */
let lastAttempt: { email: string; error: string | null } = { email: "", error: null };

export function UnlockDeviceForm() {
  const router = useRouter();
  const [email, setEmailState] = useState(lastAttempt.email);
  const [busy, setBusy] = useState(false);
  const [error, setErrorState] = useState<string | null>(lastAttempt.error);

  function setEmail(value: string) {
    lastAttempt = { email: value, error: lastAttempt.error };
    setEmailState(value);
  }

  function setError(value: string | null) {
    lastAttempt = { ...lastAttempt, error: value };
    setErrorState(value);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = readUnlockResult(await unlockByEmail({ data: { email } }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      lastAttempt = { email: "", error: null };
      await router.invalidate();
    } catch (err) {
      setError(unlockErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
      <label htmlFor="unlock-email" className="text-sm font-semibold text-olive">
        Already bought? Open your purchase on this computer or phone
      </label>
      <p className="text-sm text-muted">
        Type the email you used when you paid, and we’ll open your handbook (or app) right here.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="unlock-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="sm:flex-1"
        />
        <Button type="submit" variant="outline" disabled={busy || !email.trim()}>
          {busy ? "Checking…" : "Open my purchase"}
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-gold bg-paper px-3 py-2 text-sm font-semibold text-ink"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Friendly paywall shown in place of a locked page. */
export function LockScreen({
  need,
  compact = false,
}: {
  need: Exclude<AccessNeed, "none">;
  compact?: boolean;
}) {
  const isApp = need === "app";
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const onHome = pathname === "/";
  const product = useUnlockedProduct();
  // Bought the handbook, not the app: gentle add-on tone, handbook first.
  const handbookBuyer = isApp && product === "handbook";
  const Heading = compact ? "h2" : "h1";
  return (
    <div className={compact ? "no-print" : "no-print flex flex-col gap-5"}>
      {!isApp && !compact ? (
        <Link
          to="/guide"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive"
        >
          <ArrowLeft className="size-4" />
          Back to all chapters
        </Link>
      ) : null}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-gold">
          <Lock className="size-4" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            {handbookBuyer ? "Optional add-on" : "Deep Focus handbook"}
          </p>
        </div>
        {isApp && !handbookBuyer ? (
          <p className="-mb-2 text-sm text-muted">
            {toolNameForPath(pathname)} isn’t part of the free preview.
          </p>
        ) : null}
        <Heading className="font-display text-3xl leading-tight text-olive text-balance">
          {!isApp
            ? "This chapter is in the handbook"
            : handbookBuyer
              ? `${toolNameForPath(pathname)} is part of the Deep Focus app`
              : "Start with the handbook"}
        </Heading>
        <p className="max-w-prose text-pretty text-ink">
          {!isApp
            ? `Chapter 1 is free to read. The rest of the guide is in the handbook: ${PRICE_LABEL}, pay once.`
            : handbookBuyer
              ? `Your handbook is unlocked, and everything in it works on paper. The Deep Focus app is an optional add-on to the handbook: a daily planner, focus bell, energy log and weekly planner in your browser, nothing to install. ${APP_PRICE_LABEL}. ${APP_ACCESS_LINE}`
              : `Seven short chapters on working from home: your workspace, household, phone, daily rituals, deep work, people and energy. One action per chapter. Online guide plus the PDF, ${PRICE_LABEL}, pay once.`}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {handbookBuyer ? (
            <>
              <Button asChild>
                <Link to="/guide">Read the handbook</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app">Add the app ({APP_PRICE_LABEL})</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link to="/buy">Get the handbook ({PRICE_LABEL})</Link>
              </Button>
              {isApp ? (
                <Button variant="outline" asChild>
                  <Link to="/start">Try the free 7-day starter</Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/guide/$slug" params={{ slug: "intro" }}>
                    Read Chapter 1 free
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
        <div className="border-t border-yellow pt-4">
          <UnlockDeviceForm />
        </div>
        {handbookBuyer ? null : (
          <NotReadyLinks compact showHome={!onHome} showChapter={isApp} showStarter={false} />
        )}
      </Card>
      {compact ? null : (
        <p className="text-sm text-muted">
          Your notes saved on this device stay put. Nothing is deleted while a page is locked.
        </p>
      )}
    </div>
  );
}
