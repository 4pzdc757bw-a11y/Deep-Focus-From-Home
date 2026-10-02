import { LegalFooter } from "@/components/legal-footer";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, PageTitle } from "@/components/app-shell";
import { CHAPTERS } from "@/lib/content";
import { FREE_CHAPTER_SLUGS } from "@/lib/unlock/access";

export const Route = createFileRoute("/guide/")({ component: GuidePage });

function GuidePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="The handbook"
        title="Seven chapters you can use this week"
        lede="Read the chapter that names your biggest friction. Then do the action — not all seven at once."
      />
      <div className="overflow-hidden rounded-lg border border-yellow">
        <img
          src="/images/cover.jpg"
              width={800} height={1189} decoding="async"
          alt="Deep Focus from Home handbook cover — remote worker at a clean desk"
          className="hero-photo h-64 w-full sm:h-80"
        />
      </div>
      <p className="text-ink">
        New to the system?{" "}
        <Link to="/intro" className="font-semibold text-olive underline">
          How this works and FAQ
        </Link>
        .
      </p>
      {CHAPTERS.map((ch) => (
        <Link key={ch.slug} to="/guide/$slug" params={{ slug: ch.slug }} className="block">
          <Card className="transition-colors hover:bg-paper">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              {ch.number}
              {FREE_CHAPTER_SLUGS.has(ch.slug) ? " · Free sample" : ""}
            </p>
            <h2 className="mt-1 font-display text-2xl text-olive">{ch.title}</h2>
            <p className="mt-2 text-ink">{ch.summary}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-olive">
              Open chapter <ArrowRight className="size-4" />
            </p>
          </Card>
        </Link>
      ))}
      <LegalFooter className="mt-8" />
    </div>
  );
}
