import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { HandbookCheckoutLink } from "@/components/handbook-checkout-link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, PageTitle } from "@/components/app-shell";
import { LegalFooter } from "@/components/legal-footer";
import { useHasAccess } from "@/components/lock-screen";
import { Button } from "@/components/ui/button";
import { CHAPTERS } from "@/lib/content";
import { PRICE_LABEL } from "@/lib/offer";

export const Route = createFileRoute("/guide/$slug")({
  component: ChapterPage,
});

function ChapterPage() {
  const { slug } = Route.useParams();
  const ch = CHAPTERS.find((c) => c.slug === slug);
  const hasHandbook = useHasAccess("handbook");
  if (!ch) throw notFound();
  const idx = CHAPTERS.findIndex((c) => c.slug === slug);
  const nextCh = CHAPTERS[idx + 1];

  return (
    <article className="flex flex-col gap-5">
      <Link
        to="/guide"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive"
      >
        <ArrowLeft className="size-4" />
        Back to all chapters
      </Link>
      <PageTitle kicker={ch.number} title={ch.title} lede={ch.kicker} />
      {ch.body.map((p) => (
        <p key={p} className="text-pretty text-lg leading-relaxed text-ink">
          {p}
        </p>
      ))}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Action this week
        </p>
        <p className="mt-2 text-ink">{ch.action}</p>
      </Card>
      {hasHandbook ? null : (
        <Card className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            That was the free chapter
          </p>
          <p className="font-display text-2xl text-olive">Want the rest of the handbook?</p>
          <p className="text-ink">
            The rest of the guide is in the handbook: all seven chapters plus the PDF, {PRICE_LABEL},
            pay once.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <HandbookCheckoutLink>Get the handbook ({PRICE_LABEL})</HandbookCheckoutLink>
            </Button>
          </div>
        </Card>
      )}
      <nav
        aria-label="Chapter navigation"
        className="no-print flex flex-wrap items-center gap-x-5 gap-y-2"
      >
        <Link
          to="/guide"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive underline underline-offset-4"
        >
          <ArrowLeft className="size-4" />
          Back to all chapters
        </Link>
        {hasHandbook && nextCh ? (
          <Link
            to="/guide/$slug"
            params={{ slug: nextCh.slug }}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive underline underline-offset-4"
          >
            Next: {nextCh.title} <ArrowRight className="size-4" />
          </Link>
        ) : null}
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-olive underline underline-offset-4"
        >
          Back to home
        </Link>
      </nav>
      <LegalFooter className="mt-8" />
    </article>
  );
}
