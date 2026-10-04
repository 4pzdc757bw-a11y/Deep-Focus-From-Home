import { createFileRoute } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useEffect } from "react";
import { useFocusStore } from "@/lib/store";
import { withAmPm } from "@/lib/work-hours";

export const Route = createFileRoute("/household")({ component: HouseholdPage });

function SignalIcon({ kind }: { kind: "door" | "card" | "headphones" }) {
  if (kind === "door") {
    return (
      <svg viewBox="0 0 80 80" className="fridge-signal-icon" aria-hidden>
        <rect x="18" y="10" width="44" height="60" rx="3" fill="none" stroke="#3a4a32" strokeWidth="3" />
        <rect x="24" y="16" width="32" height="48" rx="2" fill="#d0dbc0" stroke="#3a4a32" strokeWidth="2" />
        <circle cx="48" cy="40" r="3" fill="#3a4a32" />
      </svg>
    );
  }
  if (kind === "card") {
    return (
      <svg viewBox="0 0 80 80" className="fridge-signal-icon" aria-hidden>
        {/* Landscape card so STOP reads cleanly */}
        <rect x="4" y="26" width="72" height="32" rx="4" fill="#c45c4a" stroke="#3a4a32" strokeWidth="2.5" />
        <text
          x="40"
          y="48"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fffef8"
          fontSize="15"
          fontFamily="Georgia, serif"
          fontWeight="700"
          letterSpacing="0.5"
        >
          STOP
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className="fridge-signal-icon" aria-hidden>
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
  const hydrated = useFocusStore((s) => s.hydrated);
  // Older saves are 24-hour ("23:00–07:00"): show them with AM/PM once.
  useEffect(() => {
    if (!hydrated || !h.hours) return;
    const shown = withAmPm(h.hours);
    if (shown !== h.hours) set({ hours: shown });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const emergencyText =
    h.emergency?.trim() || "Hurt, fire, or you cannot find a grown-up";
  const signalText =
    h.signal?.trim() || "Closed door · red card · headphones";
  const ruleText =
    h.kidVersion?.trim() ||
    "Interrupt only if someone is hurt, or you cannot find a grown-up.";

  return (
    <div className="household-print flex flex-col gap-5">
      <PageTitle
        kicker="Chapter 2"
        title="Household focus agreement"
        lede="Presence is not availability. Write the hours, the signal, and what counts as an emergency. Print one fridge poster for the whole house."
      />
      <div className="no-print flex flex-wrap gap-2">
        <Button type="button" onClick={() => window.print()}>
          Print fridge poster
        </Button>
        <p className="self-center text-sm text-muted">
          Page 1 = Signal poster · page 2 = STOP · page 3 = agreement
        </p>
      </div>

      <Card className="flex flex-col gap-3 print:hidden">
        <Field label="Core hours">
          <Input
            value={h.hours}
            onChange={(e) => set({ hours: e.target.value })}
            onBlur={(e) => {
              const shown = withAmPm(e.target.value);
              if (shown !== e.target.value) set({ hours: shown });
            }}
            placeholder="9:00 AM–12:00 PM and 1:30 PM–4:00 PM"
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

      {/* Single full-page fridge poster — adults + kids */}
      <section className="fridge-poster rounded-lg border-2 border-olive bg-cream p-5 sm:p-6">
        <div className="fridge-poster-brand flex items-baseline justify-between gap-3 border-b-2 border-olive/25 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold sm:text-xs">
              Deep Focus from Home
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted sm:text-xs">
              Household agreement · fridge poster
            </p>
          </div>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-olive sm:text-xs">
            Page 1 · fridge
          </p>
        </div>

        <div className="fridge-poster-body mt-4 flex flex-1 flex-col gap-4 sm:mt-5 sm:gap-5">
          <div className="text-center">
            <h2 className="font-display text-3xl leading-tight text-olive sm:text-4xl">
              Signal on = wait
            </h2>
            <p className="mt-1.5 text-sm text-muted sm:text-base">
              Presence is not availability
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1.5 rounded-md border border-yellow bg-paper p-2.5 sm:gap-2 sm:p-3">
              <SignalIcon kind="door" />
              <p className="text-xs font-semibold text-olive sm:text-sm">Door</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-md border border-yellow bg-paper p-2.5 sm:gap-2 sm:p-3">
              <SignalIcon kind="card" />
              <p className="text-xs font-semibold text-olive sm:text-sm">Red card</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-md border border-yellow bg-paper p-2.5 sm:gap-2 sm:p-3">
              <SignalIcon kind="headphones" />
              <p className="text-xs font-semibold text-olive sm:text-sm">Headphones</p>
            </div>
          </div>

          <div className="rounded-md border-2 border-olive bg-paper px-4 py-3 text-center sm:px-5 sm:py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold sm:text-xs">
              One rule
            </p>
            <p className="mt-1.5 font-display text-xl leading-snug text-olive sm:text-2xl">
              Signal on = wait.
            </p>
            <p className="mt-2 text-base leading-snug text-ink sm:text-lg">
              {ruleText}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Work times
              </p>
              <p className="mt-1 text-base font-semibold leading-snug text-ink sm:text-lg">
                {withAmPm(h.hours?.trim()) || (
                  <span className="font-normal text-muted print:hidden">
                    Add core hours above
                  </span>
                )}
                {!h.hours?.trim() ? (
                  <span className="hidden print:inline">—</span>
                ) : null}
              </p>
            </div>
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Our signal
              </p>
              <p className="mt-1 text-base font-semibold leading-snug text-ink sm:text-lg">
                {signalText}
              </p>
            </div>
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Interrupt OK
              </p>
              <p className="mt-1 text-base leading-snug text-ink sm:text-lg">
                {emergencyText}
              </p>
            </div>
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                During work hours
              </p>
              <p className="mt-1 text-base leading-snug text-ink sm:text-lg">
                {h.chores?.trim() || (
                  <span className="font-normal text-muted print:hidden">
                    Quiet play / outdoor / snack shelf
                  </span>
                )}
                {!h.chores?.trim() ? (
                  <span className="hidden print:inline">Quiet play · outdoor · snack shelf</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        <div className="fridge-poster-foot mt-4 flex items-end justify-between gap-3 border-t-2 border-olive/25 pt-3 sm:mt-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
              Signed by
            </p>
            {/* Always blank for handwriting — do not print filled names */}
            <p className="fridge-sign-line mt-2 border-b border-olive/50 text-base leading-none text-transparent sm:text-lg">
              &nbsp;
            </p>
          </div>
          <p className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted sm:text-xs">
            deepfocus.jeffsebiz.com
          </p>
        </div>
      </section>

      {/* Page 2 — door STOP sign (tape on door) */}
      <section className="door-stop-sign mt-5 rounded-lg border-2 border-olive bg-cream p-5 sm:p-6 print:mt-0">
        <div className="door-stop-brand flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold sm:text-xs">
            Deep Focus from Home · door sign
          </p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-olive sm:text-xs">
            Page 2 · tape on door
          </p>
        </div>

        <div className="door-stop-stage flex flex-1 flex-col items-center justify-center py-6 sm:py-8">
          <svg
            className="door-stop-octagon"
            viewBox="0 0 200 200"
            role="img"
            aria-label="STOP"
          >
            {/* Classic flat-top octagon: cream field, strong red border + STOP */}
            <polygon
              points="62,14 138,14 186,62 186,138 138,186 62,186 14,138 14,62"
              fill="#fffef8"
              stroke="#c45c4a"
              strokeWidth="10"
              strokeLinejoin="round"
            />
            <polygon
              points="68,26 132,26 174,68 174,132 132,174 68,174 26,132 26,68"
              fill="none"
              stroke="#c45c4a"
              strokeWidth="2.5"
              strokeLinejoin="round"
              opacity="0.55"
            />
            <text
              x="100"
              y="112"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#c45c4a"
              fontSize="48"
              fontFamily="Georgia, 'Iowan Old Style', Palatino, serif"
              fontWeight="700"
              letterSpacing="4"
            >
              STOP
            </text>
          </svg>
          <p className="door-stop-caption mt-5 text-center text-sm text-muted sm:text-base">
            Signal on = wait. Tape this on the door.
          </p>
        </div>

        <div className="door-stop-foot flex justify-center border-t border-olive/20 pt-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted sm:text-xs">
            deepfocus.jeffsebiz.com
          </p>
        </div>
      </section>

      {/* Page 3 — household agreement (adult detail) */}
      <section className="household-agreement mt-5 rounded-lg border-2 border-olive bg-cream p-5 sm:p-6 print:mt-0">
        <div className="household-agreement-brand flex items-baseline justify-between gap-3 border-b-2 border-olive/25 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold sm:text-xs">
              Deep Focus from Home
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted sm:text-xs">
              Household agreement · keep with the adults
            </p>
          </div>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-olive sm:text-xs">
            Page 3 · agreement
          </p>
        </div>

        <div className="household-agreement-body mt-4 flex flex-1 flex-col gap-4 sm:mt-5 sm:gap-5">
          <div>
            <h2 className="font-display text-2xl leading-tight text-olive sm:text-3xl">
              Household focus agreement
            </h2>
            <p className="mt-1.5 text-sm text-muted sm:text-base">
              Presence is not availability. Same rules as the fridge poster, with room to write.
            </p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Core hours
              </dt>
              <dd className="mt-1 text-base font-semibold leading-snug text-ink sm:text-lg">
                {withAmPm(h.hours?.trim()) || "—"}
              </dd>
            </div>
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Visible signal
              </dt>
              <dd className="mt-1 text-base font-semibold leading-snug text-ink sm:text-lg">
                {signalText}
              </dd>
            </div>
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Emergency (interrupt OK)
              </dt>
              <dd className="mt-1 text-base leading-snug text-ink sm:text-lg">
                {emergencyText}
              </dd>
            </div>
            <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
                Chores during work hours
              </dt>
              <dd className="mt-1 text-base leading-snug text-ink sm:text-lg">
                {h.chores?.trim() || "Quiet play · outdoor · snack shelf — not knocking"}
              </dd>
            </div>
          </dl>

          <div className="rounded-md border border-yellow bg-paper px-3 py-2.5 sm:px-4 sm:py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
              Kid version
            </p>
            <p className="mt-1 text-base leading-snug text-ink sm:text-lg">{ruleText}</p>
          </div>
        </div>

        <div className="household-agreement-foot mt-4 flex items-end justify-between gap-3 border-t-2 border-olive/25 pt-3 sm:mt-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold sm:text-xs">
              Signed by
            </p>
            <p className="fridge-sign-line mt-2 border-b border-olive/50 text-base leading-none text-transparent sm:text-lg">
              &nbsp;
            </p>
            {h.signedBy?.trim() ? (
              <p className="mt-1 text-sm text-muted print:hidden">{h.signedBy}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted sm:text-xs">
            deepfocus.jeffsebiz.com
          </p>
        </div>
      </section>
    </div>
  );
}
