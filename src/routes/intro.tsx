import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useHasAccess } from "@/components/lock-screen";
import { APP_LINE, FAQ, HOW_IT_WORKS } from "@/lib/content";

export const Route = createFileRoute("/intro")({ component: IntroPage });

function IntroPage() {
  const appUnlocked = useHasAccess("app");
  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="How this works"
        title="A small system for working from home"
        lede={APP_LINE}
      />

      <Card>
        <p className="text-pretty text-lg leading-relaxed text-ink">
          Remote work promised freedom. For many people it also delivered days
          that dissolve into chores, phone checks, and low-grade guilt. That is
          not a willpower failure. An office supplied structure, separation, and
          a little social pressure by default. Home took those away.
        </p>
        <p className="mt-3 text-pretty text-lg leading-relaxed text-ink">
          This program puts a small system back. You do not overhaul your life.
          You claim a surface, set a household signal, protect the first block,
          and shut the day down on purpose. The handbook is the why. The forms
          are the how — daily page, starter week, household agreement, energy log.
          {appUnlocked ? " In the app, those forms are built in." : ""}
        </p>
      </Card>

      <h2 className="font-display text-2xl text-olive">The path</h2>
      {HOW_IT_WORKS.map((item) => (
        <Card key={item.step} className="flex gap-3">
          <span className="font-display text-2xl text-gold">{item.step}</span>
          <div>
            <h3 className="font-display text-xl text-olive">{item.title}</h3>
            <p className="mt-1 text-ink">{item.copy}</p>
          </div>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/starter">
            Start the 7-day week <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/guide">Read the chapters</Link>
        </Button>
      </div>

      <h2 className="mt-4 font-display text-2xl text-olive">Questions</h2>
      <div className="flex flex-col gap-2">
        {FAQ.filter((item) => appUnlocked || !("appOnly" in item && item.appOnly)).map((item) => (
          <details
            key={item.q}
            className="rounded-lg border border-yellow bg-cream px-4 py-2"
          >
            <summary className="min-h-12 cursor-pointer py-2 font-display text-lg text-olive">
              {item.q}
            </summary>
            <p className="pb-3 text-pretty leading-relaxed text-ink">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
