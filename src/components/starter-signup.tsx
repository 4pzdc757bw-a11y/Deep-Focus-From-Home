import { type FormEvent, useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/app-shell";
import { STARTER_PDF } from "@/lib/content";
import { saveLeadEmail } from "@/lib/offer";
import { cn } from "@/lib/utils";
import { KIT_FORM_ACTION, KIT_ORIGIN, STARTER_SIGNUP_SUCCESS, submitToKit } from "@/lib/kit";

/**
 * Free 7-day pack sign-up → Kit form "Free 7-Day Pack signup" (public form
 * endpoint; no API key). Kit sends its double opt-in confirmation email.
 * Works without JS too (plain POST to the same endpoint).
 */
const SIGNED_UP_KEY = "df-starter-signed-up";

type Status = "idle" | "sending" | "guard" | "done" | "error";

export function StarterSignupForm({
  buttonLabel = "Send me Day 1",
  className,
}: {
  buttonLabel?: string;
  className?: string;
}) {
  const id = useId();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [guardUrl, setGuardUrl] = useState<string | null>(null);
  const [guardHeight, setGuardHeight] = useState(520);

  function finish() {
    saveLeadEmail(email);
    try {
      window.localStorage.setItem(SIGNED_UP_KEY, "1");
    } catch {
      /* storage blocked */
    }
    setStatus("done");
  }

  // Kit's security check reports back with postMessage (same events ck.js uses).
  useEffect(() => {
    if (status !== "guard") return;
    function onMessage(e: MessageEvent) {
      if (e.origin !== KIT_ORIGIN || !e.data || typeof e.data !== "object") return;
      const { name, height } = e.data as { name?: string; height?: number };
      if (name === "ckjs:guard:size" && typeof height === "number") {
        setGuardHeight(Math.min(Math.max(height, 200), 700));
      } else if (name === "ckjs:guard:confirmed") {
        finish();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);
    const result = await submitToKit(firstName, email);
    if (result.ok && result.guardUrl) {
      setGuardUrl(result.guardUrl);
      setStatus("guard");
    } else if (result.ok) {
      finish();
    } else {
      setStatus("error");
      setError(result.message ?? "That didn’t go through. Check the email address and try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("rounded-md border-2 border-olive bg-paper p-4 text-olive", className)}
      >
        <p className="font-display text-lg">{STARTER_SIGNUP_SUCCESS}</p>
        <p className="mt-1 text-sm text-muted">
          Not there in a few minutes? Check spam or promotions.
        </p>
        <div className="mt-3 flex flex-col gap-2 border-t border-yellow pt-3">
          <p className="text-sm font-semibold text-ink">Don’t wait for the email. Start now:</p>
          <Button asChild className="h-auto min-h-11 py-2.5 sm:self-start">
            <a href={STARTER_PDF} download>
              <Download className="size-4 shrink-0" /> Download your fillable 7-day pack (PDF)
            </a>
          </Button>
          <p className="text-sm text-ink">
            Or fill it in right here, day by day:{" "}
            <Link to="/starter" className="font-semibold text-olive underline underline-offset-4">
              open the 7-day starter
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  if (status === "guard" && guardUrl) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="font-semibold text-olive">One more step: a quick security check from Kit, our email service.</p>
        <iframe
          title="Kit security check"
          src={guardUrl}
          className="w-full rounded-md border border-gold bg-paper"
          style={{ height: guardHeight }}
        />
        <p className="text-sm text-muted">
          Check not showing?{" "}
          <a href={guardUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-olive underline underline-offset-4">
            Open it in a new tab
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      action={KIT_FORM_ACTION}
      method="post"
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`${id}-first`}>
          First name
        </label>
        <input
          id={`${id}-first`}
          name="fields[first_name]"
          type="text"
          autoComplete="given-name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className="h-12 w-full min-w-0 rounded-md border border-gold bg-paper px-3 text-base text-ink outline-none focus:ring-2 focus:ring-gold/30 sm:w-40 sm:shrink-0"
        />
        <label className="sr-only" htmlFor={`${id}-email`}>
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email_address"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="h-12 w-full min-w-0 rounded-md sm:flex-1 border border-gold bg-paper px-3 text-base text-ink outline-none focus:ring-2 focus:ring-gold/30"
        />
        <Button type="submit" className="h-12" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : buttonLabel}
        </Button>
      </div>
      <SignupConsentLine />
      {status === "error" && error ? (
        <p role="alert" aria-live="assertive"
          className="rounded-md border border-gold bg-paper px-3 py-2 text-sm font-semibold text-ink">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Vera-approved signup disclosure, shown with every sign-up form. No
 * pre-ticked boxes: submitting the form is the opt-in, and Kit's double
 * opt-in email confirms it.
 */
export function SignupConsentLine({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted", className)}>
      One short email a day for 7 days, then occasional updates and offers from
      Jeffsebiz. Unsubscribe anytime. See our{" "}
      <Link to="/privacy" className="font-semibold text-olive underline underline-offset-4">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

/** True once this browser has signed up (hides repeat prompts). */
export function useStarterSignedUp() {
  const [signedUp, setSignedUp] = useState(false);
  useEffect(() => {
    try {
      setSignedUp(window.localStorage.getItem(SIGNED_UP_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);
  return signedUp;
}

/** Compact card for Home / the starter page. */
export function StarterSignupCard({ title, className }: { title: string; className?: string }) {
  const signedUp = useStarterSignedUp();
  if (signedUp) return null;
  return (
    <Card className={cn("no-print flex flex-col gap-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
        Free 7-day pack
      </p>
      <p className="font-display text-xl text-olive">{title}</p>
      <StarterSignupForm />
    </Card>
  );
}
