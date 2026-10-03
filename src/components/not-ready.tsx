import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

/** Ways out for visitors who are not buying yet (Buy page, lock screens). */
export function NotReadyLinks({
  compact = false,
  showHome = true,
  showChapter = true,
}: {
  compact?: boolean;
  showHome?: boolean;
  showChapter?: boolean;
}) {
  const links = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {showChapter ? (
        <Button variant="outline" asChild>
          <Link to="/guide/$slug" params={{ slug: "intro" }}>
            <BookOpen className="size-4" /> Read Chapter 1 free
          </Link>
        </Button>
      ) : null}
      {showHome ? (
        <Link
          to="/"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-olive underline underline-offset-4"
        >
          Back to home
        </Link>
      ) : null}
      <Link
        to="/intro"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-olive underline underline-offset-4"
      >
        How it works + FAQ <ArrowRight className="size-4" />
      </Link>
    </div>
  );
  if (compact) {
    return (
      <div className="flex flex-col gap-2 border-t border-yellow pt-4">
        <p className="text-sm font-semibold text-olive">Not ready yet?</p>
        {links}
      </div>
    );
  }
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Not ready yet?</p>
      <p className="font-display text-2xl text-olive">Look around first</p>
      <p className="text-ink">
        Chapter 1 of the handbook is free to read. Nothing here charges you until you choose
        an offer above.
      </p>
      {links}
    </Card>
  );
}
