import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card, PageTitle } from "@/components/app-shell";
import { CHAPTERS } from "@/lib/content";

export const Route = createFileRoute("/guide/$slug")({
  component: ChapterPage,
});

function ChapterPage() {
  const { slug } = Route.useParams();
  const ch = CHAPTERS.find((c) => c.slug === slug);
  if (!ch) throw notFound();

  return (
    <article className="flex flex-col gap-5">
      <Link
        to="/guide"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-olive"
      >
        <ArrowLeft className="size-4" />
        All chapters
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
    </article>
  );
}
