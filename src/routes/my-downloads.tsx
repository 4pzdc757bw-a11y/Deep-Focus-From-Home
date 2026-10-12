import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Card, PageTitle } from "@/components/app-shell";
import { LegalFooter } from "@/components/legal-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getMyDownloads,
  type MyDownloadsResult,
} from "@/lib/downloads/my-downloads";

export const Route = createFileRoute("/my-downloads")({
  component: MyDownloadsPage,
});

const FALLBACK_ERROR =
  "Something went wrong. Try again, or email support@deepfocusfromhome.com.";

function MyDownloadsPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MyDownloadsResult | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const out = await getMyDownloads({ data: { email } });
      setResult(
        out && typeof out === "object" && "ok" in out
          ? out
          : { ok: false, error: FALLBACK_ERROR },
      );
    } catch {
      setResult({ ok: false, error: FALLBACK_ERROR });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Handbook"
        title="My downloads"
        lede="Get your handbook PDFs and fillable worksheets again, any time. Type the email you paid with and we'll email you fresh links."
      />
      <Card className="flex flex-col gap-3">
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
          <label
            htmlFor="my-downloads-email"
            className="text-sm font-semibold text-olive"
          >
            Email you paid with
          </label>
          <div className="flex flex-row gap-2">
            <Input
              id="my-downloads-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              className="shrink-0"
              disabled={busy || !email.trim()}
            >
              {busy ? "Sending…" : "Email my download links"}
            </Button>
          </div>
        </form>
        {result && !result.ok ? (
          <p
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-gold bg-paper px-3 py-2 text-sm font-semibold text-ink"
          >
            {result.error}
          </p>
        ) : null}
        {result && result.ok ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-md border border-olive bg-paper px-3 py-2 text-sm font-semibold text-olive"
          >
            {result.message}
          </p>
        ) : null}
      </Card>
      <p className="text-sm text-muted">
        <Link
          to="/guide"
          className="font-semibold text-olive underline underline-offset-4"
        >
          Back to the handbook
        </Link>
      </p>
      <LegalFooter />
    </div>
  );
}
