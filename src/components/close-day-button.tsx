import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { FridayReviewSheet } from "@/components/friday-review-sheet";
import { SheetPortal } from "@/components/sheet-portal";
import { WeeklyPlannerSheet } from "@/components/weekly-planner-sheet";
import { Button } from "@/components/ui/button";
import { closeDay } from "@/lib/close-day";
import { saveDailyPdf } from "@/lib/daily-pdf";
import { useFocusStore } from "@/lib/store";
import { printDaily, printedRecently } from "@/lib/print";
import { cn, isDateKey, isFriday } from "@/lib/utils";
import { currentWorkdayKey } from "@/lib/workday";

/** Friday review follows the work day: a Friday-night shift closes on Saturday morning. */
function dayIsFriday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return isFriday(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

type Phase =
  | "idle"
  | "week-plan"
  | "friday-review"
  | "confirm"
  | "offer-pdf";

/**
 * Close-day flow. `variant="nav"` is the rightmost bottom-nav action;
 * `variant="inline"` is the outline button under the Shutdown note.
 * On Friday: Weekly Work Planner → Friday review → confirm Close. Otherwise
 * confirm → copy shutdown note to starter day (if in week one), mark day
 * done, offer Save PDF, advance to the next calendar day.
 */
export function CloseDayButton({
  className,
  variant = "nav",
}: {
  className?: string;
  variant?: "nav" | "inline";
}) {
  const navigate = useNavigate();
  const starterStart = useFocusStore((s) => s.starterStart);
  // Close the day being viewed (/daily?date=Wed closes Wednesday), else today's work day.
  const viewedDate = useRouterState({
    select: (s) =>
      s.location.pathname === "/daily"
        ? ((s.location.search as { date?: unknown }).date as string | undefined)
        : undefined,
  });
  const closingDate = () => (isDateKey(viewedDate) ? viewedDate : currentWorkdayKey());
  const [phase, setPhase] = useState<Phase>("idle");
  const [next, setNext] = useState<{ closedDate: string; nextDate: string } | null>(
    null,
  );
  // Printed / saved this day's PDF in the last ~10 min → don't ask again.
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function startClose() {
    setAlreadySaved(printedRecently(closingDate()));
    if (dayIsFriday(closingDate())) {
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
    const closedDate = closingDate();
    const result = closeDay(closedDate);
    setNext({ closedDate, nextDate: result.nextDate });
    if (printedRecently(closedDate)) {
      // Already saved a few minutes ago: straight to the next work day.
      setPhase("idle");
      void navigate({ to: "/daily", search: { date: result.nextDate } });
      return;
    }
    setPhase("offer-pdf");
  }

  /** Close, then offer Save PDF / Print again even though it was saved recently. */
  function runCloseAndSaveAgain() {
    const closedDate = closingDate();
    const result = closeDay(closedDate);
    setNext({ closedDate, nextDate: result.nextDate });
    setPhase("offer-pdf");
  }

  /** "Save PDF": a real PDF straight to Downloads (no print dialog), then next day. */
  function downloadPdfThenAdvance(target = next) {
    const closedDate = target?.closedDate ?? closingDate();
    const nextDate = target?.nextDate;
    setSaving(true);
    void saveDailyPdf(closedDate).then((ok) => {
      setSaving(false);
      if (!ok) {
        // Could not build the file here: fall back to the print dialog.
        printThenAdvance(target);
        return;
      }
      setPhase("idle");
      if (nextDate) void navigate({ to: "/daily", search: { date: nextDate } });
    });
  }

  /** "Print": the browser print dialog for the closed day, then next day. */
  function printThenAdvance(target = next) {
    setPhase("idle");
    const closedDate = target?.closedDate ?? closingDate();
    const nextDate = target?.nextDate;
    // Land on the closed day's Daily OS so it is what prints, then offer Save as PDF.
    void navigate({ to: "/daily", search: { date: closedDate } }).then(() => {
      window.setTimeout(() => {
        printDaily(closedDate);
        if (nextDate) void navigate({ to: "/daily", search: { date: nextDate } });
      }, 200);
    });
  }

  function advance() {
    setPhase("idle");
    if (next?.nextDate) {
      void navigate({ to: "/daily", search: { date: next.nextDate } });
    }
  }

  function dismissConfirm() {
    setPhase("idle");
  }

  useEffect(() => {
    if (phase !== "confirm" && phase !== "offer-pdf") return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (phase === "confirm") dismissConfirm();
      else advance();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next]);

  return (
    <>
      {variant === "inline" ? (
        <Button
          type="button"
          variant="outline"
          className={className}
          onClick={startClose}
          aria-haspopup="dialog"
        >
          <Moon className="size-4" />
          Close day
        </Button>
      ) : (
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
      )}

      {phase === "week-plan" ? (
        <WeeklyPlannerSheet onDone={afterWeekPlan} date={closingDate()} />
      ) : null}

      {phase === "friday-review" ? (
        <FridayReviewSheet onDone={afterFridayReview} date={closingDate()} />
      ) : null}

      {phase === "confirm" ? (
        <SheetPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-day-title"
          onClick={dismissConfirm}
        >
          <div
            className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                End of day
              </p>
              <h2 id="close-day-title" className="mt-1 font-display text-2xl text-olive">
                Close today?
              </h2>
              <p className="mt-2 text-ink">
                Marks today done (and copies your Shutdown note and Other things
                I did today into the starter day’s “one line” during week one), keeps the Daily OS in local
                history, then{" "}
                {alreadySaved
                  ? "moves you to your next work day."
                  : "offers Save PDF or Print and moves you to your next work day."}
              </p>
              {alreadySaved ? (
                <p className="mt-2 text-sm text-olive">
                  You already saved today’s PDF, so it won’t ask again.
                </p>
              ) : null}
            </div>
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
                onClick={dismissConfirm}
              >
                Not yet
              </button>
              {alreadySaved ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-gold underline underline-offset-4"
                  onClick={runCloseAndSaveAgain}
                >
                  Close and save or print again
                </button>
              ) : null}
            </div>
          </div>
        </div>
        </SheetPortal>
      ) : null}

      {phase === "offer-pdf" ? (
        <SheetPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-pdf-title"
          onClick={advance}
        >
          <div
            className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Day closed
              </p>
              <h2 id="save-pdf-title" className="mt-1 font-display text-2xl text-olive">
                Keep a copy of today?
              </h2>
              <p className="mt-2 text-ink">
                Save PDF puts a copy of today’s OS in your Downloads folder. Print
                opens your printer.
              </p>
              <p className="mt-2 text-ink">Your notes stay on this device either way.</p>
              {!starterStart ? (
                <p className="mt-3 rounded-md border border-yellow bg-paper p-3 text-sm text-ink">
                  Tip: you haven’t set up your 7-day starter week yet.{" "}
                  <Link
                    to="/starter"
                    className="font-semibold text-olive underline"
                    onClick={() => setPhase("idle")}
                  >
                    Set it up
                  </Link>{" "}
                  when you’re ready — it gives each day one small job.
                </p>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-4 text-sm font-semibold text-cream"
                disabled={saving}
                onClick={() => downloadPdfThenAdvance()}
              >
                {saving ? "Saving…" : "Save PDF"}
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md border border-olive bg-paper px-4 text-sm font-semibold text-olive"
                disabled={saving}
                onClick={() => printThenAdvance()}
              >
                Print
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
        </SheetPortal>
      ) : null}
    </>
  );
}
