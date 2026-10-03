import { getRouteApi, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_PRICE_LABEL, PRICE_LABEL } from "@/lib/offer";
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
        Already bought? Unlock this device
      </label>
      <p className="text-sm text-muted">
        Type the email you used at checkout. We check it with Stripe.
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
          {busy ? "Checking…" : "Unlock this device"}
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
  const onHome = useRouterState({ select: (st) => st.location.pathname }) === "/";
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
            {isApp ? "Deep Focus app" : "Deep Focus handbook"}
          </p>
        </div>
        <Heading className="font-display text-3xl leading-tight text-olive text-balance">
          {isApp
            ? onHome
              ? "Today’s planner is part of the Deep Focus app"
              : "This planner is part of the Deep Focus app"
            : "This chapter is in the handbook"}
        </Heading>
        <p className="max-w-prose text-pretty text-ink">
          {isApp
            ? `The Deep Focus app goes with the handbook: a daily planner, focus bell, energy log and weekly planner that run right in your browser. ${APP_PRICE_LABEL}, pay once.`
            : `Chapter 1 is free to read. The rest of the guide is in the handbook (${PRICE_LABEL}) or the app (${APP_PRICE_LABEL}).`}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isApp ? (
            <Button asChild>
              <Link to="/buy">Get the app ({APP_PRICE_LABEL})</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/buy">Get the handbook ({PRICE_LABEL})</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/buy">Get the app ({APP_PRICE_LABEL})</Link>
              </Button>
            </>
          )}
        </div>
        <div className="border-t border-yellow pt-4">
          <UnlockDeviceForm />
        </div>
        <NotReadyLinks compact showHome={!onHome} />
      </Card>
      {compact ? null : (
        <p className="text-sm text-muted">
          Your notes saved on this device stay put. Nothing is deleted while a page is locked.
        </p>
      )}
    </div>
  );
}
