import { useNavigate } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { useState } from "react";
import { FridayReviewSheet } from "@/components/friday-review-sheet";
import { WeeklyPlannerSheet } from "@/components/weekly-planner-sheet";
import { closeDay } from "@/lib/close-day";
import { cn, isFriday, todayKey } from "@/lib/utils";

type Phase =
  | "idle"
  | "week-plan"
  | "friday-review"
  | "confirm"
  | "offer-pdf";

/**
 * Rightmost bottom-nav action: on Friday, Weekly Work Planner → Friday review
 * → confirm Close. Otherwise confirm → copy shutdown note to starter day,
 * mark day done, offer Save PDF, advance to next starter day.
 */
export function CloseDayButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [next, setNext] = useState<{ nextDay: number | null; nextDate: string } | null>(
    null,
  );

  function startClose() {
    if (isFriday()) {
      setPhase("week-plan");
      return;
    }
    setPhase("confirm");
  }

  function afterWeekPlan() {
    setPhase("friday-review");
  }

  function afterFridayReview() {
    setPhase("confirm");
  }

  function runClose() {
    const result = closeDay(todayKey());
    setNext({ nextDay: result.nextDay, nextDate: result.nextDate });
    setPhase("offer-pdf");
  }

  function savePdfThenAdvance() {
    setPhase("idle");
    const nextDay = next?.nextDay ?? null;
    const nextDate = next?.nextDate;
    // Land on Today so the Daily OS is what prints, then offer Save as PDF.
    void navigate({ to: "/" }).then(() => {
      window.setTimeout(() => {
        window.print();
        if (nextDay != null && nextDate) {
          void navigate({ to: "/daily", search: { date: nextDate } });
        } else {
          void navigate({ to: "/starter" });
        }
      }, 200);
    });
  }

  function advance() {
    setPhase("idle");
    if (next?.nextDay != null) {
      void navigate({ to: "/daily", search: { date: next.nextDate } });
    } else {
      void navigate({ to: "/starter" });
    }
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted",
          className,
        )}
        onClick={startClose}
        aria-haspopup="dialog"
      >
        <Moon className="size-5" strokeWidth={1.8} />
        Close day
      </button>

      {phase === "week-plan" ? (
        <WeeklyPlannerSheet onDone={afterWeekPlan} />
      ) : null}

      {phase === "friday-review" ? (
        <FridayReviewSheet onDone={afterFridayReview} />
      ) : null}

      {phase === "confirm" ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-olive/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-day-title"
        >
          <div className="w-full max-w-md rounded-lg border border-yellow bg-cream p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              End of day
            </p>
            <h2 id="close-day-title" className="mt-1 font-display text-2xl text-olive">
              Close today?
            </h2>
            <p className="mt-2 text-ink">
              Copies your Shutdown note into this starter day’s “one line,”
              marks the day done, keeps the Daily OS in local history, then
              offers Save PDF and moves you to the next day.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-4 text-sm font-semibold text-cream"
                onClick={runClose}
              >
                Close day
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md border border-yellow bg-paper px-4 text-sm font-semibold text-olive"
                onClick={() => setPhase("idle")}
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "offer-pdf" ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-olive/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-pdf-title"
        >
          <div className="w-full max-w-md rounded-lg border border-yellow bg-cream p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Day closed
            </p>
            <h2 id="save-pdf-title" className="mt-1 font-display text-2xl text-olive">
              Save PDF to Downloads?
            </h2>
            <p className="mt-2 text-ink">
              Opens print — choose “Save as PDF” to keep a copy of today’s OS.
              Your notes stay on this device either way.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-4 text-sm font-semibold text-cream"
                onClick={savePdfThenAdvance}
              >
                Save PDF
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md border border-yellow bg-paper px-4 text-sm font-semibold text-olive"
                onClick={advance}
              >
                Skip — next day
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
