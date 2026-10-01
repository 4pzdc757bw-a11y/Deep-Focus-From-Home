import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Card } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal-footer";
import { STARTER_DAYS } from "@/lib/content";
import { saveLeadEmail } from "@/lib/offer";

export const Route = createFileRoute("/start")({ component: StartPage });

function OptIn({ label }: { label: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveLeadEmail(email);
    void navigate({ to: "/thanks" });
  }

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={`email-${label}`}>
        Email
      </label>
      <input
        id={`email-${label}`}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="h-12 min-w-0 flex-1 rounded-md border border-gold bg-paper px-3 text-base text-ink outline-none focus:ring-2 focus:ring-gold/30"
      />
      <Button type="submit" className="h-12">
        {label}
      </Button>
    </form>
  );
}

function StartPage() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Free 7-day pack for remote workers
      </p>
      <h1 className="font-display text-4xl leading-tight text-olive text-balance">
        Focus is a design problem, not a character test.
      </h1>
      <p className="max-w-prose text-lg leading-relaxed text-ink">
        Home removed the structure an office used to supply. This free pack puts
        one small system back — one job per day, on your phone. Nothing to buy
        to start.
      </p>

      <div className="overflow-hidden rounded-lg border border-yellow">
        <img
          src="/images/cover.jpg"
              width={800} height={1189} fetchPriority="high" decoding="async"
          alt="A remote worker at a clean desk, looking at a computer"
          className="hero-photo h-56 w-full sm:h-72"
        />
      </div>

      <Card className="flex flex-col gap-3">
        <p className="font-display text-xl text-olive">Start Day 1 tomorrow morning.</p>
        <OptIn label="Send me the 7-day pack" />
        <p className="text-sm text-muted">
          One email. You can leave anytime. No webinar.
        </p>
      </Card>

      <div>
        <h2 className="font-display text-2xl text-olive">Home is sanctuary and distraction.</h2>
        <p className="mt-2 max-w-prose text-ink">
          The laundry is visible. The phone is in reach. Nobody sees whether you
          are in deep work or scrolling. That is not a willpower failure. It is
          a missing system. Each day has one job. Then you stop.
        </p>
      </div>

      <div>
        <h2 className="font-display text-2xl text-olive">Seven days. One job each day.</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {STARTER_DAYS.map((d) => (
            <Card key={d.day}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                Day {d.day} — {d.title}
              </p>
              <p className="mt-1 text-ink">{d.job}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <p className="font-display text-2xl italic text-olive">Presence is not availability.</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          From Deep Focus from Home
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-olive">The first job is a desk, not a course.</h2>
        <OptIn label="Send me the pack" />
      </Card>

      <LegalFooter />
    </div>
  );
}
