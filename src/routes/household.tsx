import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";

export const Route = createFileRoute("/household")({ component: HouseholdPage });

function SignalIcon({ kind }: { kind: "door" | "card" | "headphones" }) {
  if (kind === "door") {
    return (
      <svg viewBox="0 0 80 80" className="size-16 sm:size-20" aria-hidden>
        <rect x="18" y="10" width="44" height="60" rx="3" fill="none" stroke="#3a4a32" strokeWidth="3" />
        <rect x="24" y="16" width="32" height="48" rx="2" fill="#d0dbc0" stroke="#3a4a32" strokeWidth="2" />
        <circle cx="48" cy="40" r="3" fill="#3a4a32" />
      </svg>
    );
  }
  if (kind === "card") {
    return (
      <svg viewBox="0 0 80 80" className="size-16 sm:size-20" aria-hidden>
        <rect x="22" y="14" width="36" height="52" rx="4" fill="#c45c4a" stroke="#3a4a32" strokeWidth="2.5" />
        <text
          x="40"
          y="46"
          textAnchor="middle"
          fill="#fffef8"
          fontSize="18"
          fontFamily="Georgia, serif"
          fontWeight="700"
        >
          STOP
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className="size-16 sm:size-20" aria-hidden>
      <path
        d="M22 36c0-10 8-18 18-18s18 8 18 18"
        fill="none"
        stroke="#3a4a32"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="14" y="36" width="14" height="22" rx="4" fill="#d0dbc0" stroke="#3a4a32" strokeWidth="2.5" />
      <rect x="52" y="36" width="14" height="22" rx="4" fill="#d0dbc0" stroke="#3a4a32" strokeWidth="2.5" />
    </svg>
  );
}

function HouseholdPage() {
  const h = useFocusStore((s) => s.household);
  const set = useFocusStore((s) => s.setHousehold);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Chapter 2"
        title="Household focus agreement"
        lede="Presence is not availability. Write the hours, the signal, and what counts as an emergency. Print the kid poster for the fridge."
      />
      <div className="no-print flex flex-wrap gap-2">
        <Button type="button" onClick={() => window.print()}>
          Print fridge poster
        </Button>
        <p className="self-center text-sm text-muted">
          Page 1 = kids · page 2 = adult detail (optional)
        </p>
      </div>

      <Card className="flex flex-col gap-3 print:hidden">
        <Field label="Core hours">
          <Input
            value={h.hours}
            onChange={(e) => set({ hours: e.target.value })}
            placeholder="9:00–12:00 and 13:30–16:00"
          />
        </Field>
        <Field label="Visible signal">
          <Input
            value={h.signal}
            onChange={(e) => set({ signal: e.target.value })}
            placeholder="Closed door + headphones / red card"
          />
        </Field>
        <Field label="What counts as an emergency">
          <Textarea
            value={h.emergency}
            onChange={(e) => set({ emergency: e.target.value })}
            placeholder="Hurt, fire, or you cannot find a grown-up"
          />
        </Field>
        <Field label="Chores during work hours">
          <Textarea
            value={h.chores}
            onChange={(e) => set({ chores: e.target.value })}
            placeholder="Quiet play / outdoor / snack shelf — not knocking"
          />
        </Field>
        <Field label="Kid version (extra words if you want)">
          <Textarea
            value={h.kidVersion}
            onChange={(e) => set({ kidVersion: e.target.value })}
            placeholder="When the signal is on, wait. Interrupt only for hurt or lost grown-up."
          />
        </Field>
        <Field label="Signed by (names in this house)">
          <Input
            value={h.signedBy}
            onChange={(e) => set({ signedBy: e.target.value })}
            placeholder="Names"
          />
        </Field>
      </Card>

      {/* Kid-first fridge poster — print page 1 */}
      <section className="fridge-kid-sheet rounded-lg border-2 border-olive bg-cream p-5 print:border-[2.5pt] print:p-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Fridge poster · ages ~3–7
        </p>
        <h2 className="mt-2 text-center font-display text-3xl text-olive sm:text-4xl">
          Signal on = wait
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-2 rounded-md border border-yellow bg-paper p-3">
            <SignalIcon kind="door" />
            <p className="text-sm font-semibold text-olive">Door</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-md border border-yellow bg-paper p-3">
            <SignalIcon kind="card" />
            <p className="text-sm font-semibold text-olive">Red card</p>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-md border border-yellow bg-paper p-3">
            <SignalIcon kind="headphones" />
            <p className="text-sm font-semibold text-olive">Headphones</p>
          </div>
        </div>

        <div className="mt-6 rounded-md border-2 border-olive bg-paper p-4 text-center">
          <p className="font-display text-2xl text-olive">One rule</p>
          <p className="mt-2 text-xl font-semibold leading-snug text-ink">
            Signal on = wait.
          </p>
          <p className="mt-3 text-lg text-ink">
            Interrupt only if someone is hurt, or you cannot find a grown-up.
          </p>
        </div>

        {h.hours ? (
          <p className="mt-5 text-center text-base text-ink">
            <span className="font-semibold text-olive">Work times: </span>
            {h.hours}
          </p>
        ) : (
          <p className="mt-5 text-center text-base text-muted print:hidden">
            Add core hours above — they print here.
          </p>
        )}

        {h.kidVersion ? (
          <p className="mt-3 text-center text-base leading-relaxed text-ink">
            {h.kidVersion}
          </p>
        ) : null}
      </section>

      {/* Adult detail — optional print page 2 */}
      <section className="fridge-adult-sheet hidden print:block">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Adult detail · keep off the fridge if kids only need page 1
        </p>
        <h2 className="mt-1 font-display text-2xl text-olive">Household agreement</h2>
        <dl className="mt-4 flex flex-col gap-3 text-ink">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              Core hours
            </dt>
            <dd className="mt-1 text-lg">{h.hours || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              Visible signal
            </dt>
            <dd className="mt-1 text-lg">
              {h.signal || "Closed door · red card · headphones"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              Emergency (interrupt OK)
            </dt>
            <dd className="mt-1 text-lg">
              {h.emergency || "Hurt, fire, or cannot find a grown-up"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
              Chores during work hours
            </dt>
            <dd className="mt-1 text-lg">{h.chores || "—"}</dd>
          </div>
          {h.signedBy ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
                Signed by
              </dt>
              <dd className="mt-1 text-lg">{h.signedBy}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Screen preview of adult sheet */}
      <Card className="print:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Adult sheet preview
        </p>
        <p className="mt-2 text-ink">
          Prints as page 2. Kid poster (page 1) stays simple — big signals, few
          words, one interrupt rule. Adult detail stays here on the form.
        </p>
        <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
          <li>Hours: {h.hours || "—"}</li>
          <li>Signal: {h.signal || "Closed door · red card · headphones"}</li>
          <li>Emergency: {h.emergency || "Hurt / cannot find a grown-up"}</li>
        </ul>
      </Card>
    </div>
  );
}
