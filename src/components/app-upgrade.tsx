import { useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  APP_ACCESS_LINE,
  UPGRADE_LINE,
  UPGRADE_PRICE_LABEL,
} from "@/lib/offer";
import { startAppUpgrade } from "@/lib/unlock/unlock";
import { readUpgradeResult, unlockErrorText } from "@/lib/unlock/unlock-result";

const LEAD_EMAIL_KEY = "deep-focus-lead-email";

/**
 * #108: "$20 app upgrade" for handbook buyers. Only render this where the
 * device already has the handbook unlocked (lock screen, /app, home).
 * The server checks the email has a paid, unrefunded handbook purchase
 * before it hands out checkout, with that email locked in Stripe.
 */
export function AppUpgradeOffer({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LEAD_EMAIL_KEY);
      if (saved) setEmail((cur) => cur || saved);
    } catch {
      /* storage blocked */
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = readUpgradeResult(
        await startAppUpgrade({ data: { email } }),
      );
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      if (result.action === "checkout") {
        window.location.assign(result.url);
        return;
      }
      await router.invalidate();
      setBusy(false);
    } catch (err) {
      setError(unlockErrorText(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={`flex flex-col gap-2 rounded-md border border-yellow bg-paper p-4 ${className ?? ""}`}
      data-testid="app-upgrade"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
        For handbook buyers
      </p>
      <p className="font-display text-2xl text-olive">
        Upgrade to the app for {UPGRADE_PRICE_LABEL}
      </p>
      <p className="font-semibold text-ink">{UPGRADE_LINE}</p>
      <p className="text-sm text-muted">{APP_ACCESS_LINE}</p>
      <label
        htmlFor="upgrade-email"
        className="mt-1 text-sm font-semibold text-olive"
      >
        Email you bought the handbook with
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="upgrade-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="sm:flex-1"
        />
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? "Checking…" : `Upgrade to the app (${UPGRADE_PRICE_LABEL})`}
        </Button>
      </div>
      <p className="text-xs text-muted">
        The upgrade is for the email that bought the handbook. Checkout opens
        with that email.
      </p>
      {error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-gold bg-cream px-3 py-2 text-sm font-semibold text-ink"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
