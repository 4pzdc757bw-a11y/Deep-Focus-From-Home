import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { FridayReviewSheet } from "@/components/friday-review-sheet";
import { WeekRatingSheet } from "@/components/week-rating-sheet";
import { closedDaysInWeek, reviewAskDue, type ReviewKind } from "@/lib/review-ask";
import { SheetPortal } from "@/components/sheet-portal";
import { WeeklyPlannerSheet } from "@/components/weekly-planner-sheet";
import { Button } from "@/components/ui/button";
import { closeDay, nextDateAfterClose } from "@/lib/close-day";
import { blocksNeedingDone, isDayClosed, needsDoneMessage } from "@/lib/close-day-rules";
import { SHUTDOWN_AFTER_CLOSE } from "@/lib/content";
import { saveDailyPdf } from "@/lib/daily-pdf";
import { migrateDaily, useFocusStore } from "@/lib/store";
import { printDaily, printedRecently } from "@/lib/print";
import { cn, isDateKey, isFriday, prettyDate } from "@/lib/utils";
import { isWorkday, nextWorkdayFrom } from "@/lib/work-hours";
import { currentWorkdayKey } from "@/lib/workday";

/** Friday review follows the work day: a Friday-night shift closes on Saturday morning. */
function dayIsFriday(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return isFriday(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/**
 * Handbook shutdown steps 3–4. Close day moves you to the next day, so these
 * are a reminder in the pop-up rather than checkboxes on the page.
 */
function BeforeYouGo() {
  return (
    <div className="mt-3 rounded-md border border-yellow bg-paper p-3">
      <p className="text-sm font-semibold text-olive">Before you go:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink">
        {SHUTDOWN_AFTER_CLOSE.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

type Phase =
  | "idle"
  | "notice"
  | "week-plan"
  | "friday-review"
  | "week-rating"
  | "confirm"
  | "offer-pdf";

/**
 * Close-day flow. `variant="nav"` is the rightmost bottom-nav action;
 * `variant="inline"` is the outline button under the Shutdown note.
 * On Friday: Weekly Work Planner → Friday review → 1-to-5 week question (twice, a review ask) → confirm Close. Otherwise
 * confirm → copy shutdown note to starter day (if in week one), mark day
 * done, then offer Save PDF and Print (both stay open) and a separate button
 * that moves to the next work day.
 * Not offered on a day off, on a day already closed, or while a started
 * block still needs its Done clicked.
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
  // Off day or a later date: Close day shows as unavailable (greyed, not clickable).
  const viewedOff = useFocusStore((s) => {
    const d = isDateKey(viewedDate) ? viewedDate : null;
    return d ? Boolean((s.dailies[d] as { dayOff?: boolean } | undefined)?.dayOff) : false;
  });
  const viewedFuture = isDateKey(viewedDate) && viewedDate > currentWorkdayKey();
  const unavailable = viewedOff || viewedFuture;
  const [askKind, setAskKind] = useState<ReviewKind | null>(null);
  const [next, setNext] = useState<{ closedDate: string; nextDate: string } | null>(
    null,
  );
  // Printed / saved this day's PDF in the last ~10 min → don't ask again.
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // Shown after Save PDF / Print, so the screen can stay open.
  const [savedNote, setSavedNote] = useState("");
  // Why Close day can't run right now (day off, already closed, Done missing).
  const [notice, setNotice] = useState<{ title: string; text: string; showBlocks: boolean } | null>(null);

  /** Returns why this day can't be closed yet, or null if it can. */
  function blockedReason(date: string): { title: string; text: string; showBlocks: boolean } | null {
    const st = useFocusStore.getState();
    const raw = st.dailies[date];
    if (isDayClosed(raw)) {
      return { title: "Already closed", text: `${prettyDate(date)} is already closed.`, showBlocks: false };
    }
    if ((raw as { dayOff?: boolean } | undefined)?.dayOff) {
      const nextDate = nextWorkdayFrom(date, date, st.household?.workDays);
      return {
        title: "Day off",
        text: `${prettyDate(date)} is marked as a day off. Your next work day is ${prettyDate(nextDate)}.`,
        showBlocks: false,
      };
    }
    if (!isWorkday(date, st.household?.workDays)) {
      const nextDate = nextWorkdayFrom(date, date, st.household?.workDays);
      return {
        title: "Not a work day",
        text: `${prettyDate(date)} isn’t one of your work days. Your next work day is ${prettyDate(nextDate)}.`,
        showBlocks: false,
      };
    }
    const today = currentWorkdayKey();
    if (date > today) {
      return {
        title: "Not today yet",
        text: `You can plan ${prettyDate(date)} now. Close day opens on ${prettyDate(date)}.`,
        showBlocks: false,
      };
    }
    if (raw) {
      const entry = migrateDaily(raw as unknown as Record<string, unknown>, st.household?.hours);
      const pending = blocksNeedingDone(entry.slots, entry.slotCount);
      if (pending.length) {
        return {
          title: "One more step",
          text: needsDoneMessage(pending.map((i) => `Block ${i + 1}`)),
          showBlocks: true,
        };
      }
    }
    return null;
  }

  function startClose() {
    const blocked = blockedReason(closingDate());
    if (blocked) {
      setNotice(blocked);
      setPhase("notice");
      return;
    }
    setSavedNote("");
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
    const st = useFocusStore.getState();
    const date = closingDate();
    setAskKind(
      reviewAskDue({
        asks: st.reviewAsks,
        closedBefore: closedDaysInWeek(st.dailies, date),
        date,
      }),
    );
    setPhase("week-rating");
  }

  function afterWeekRating() {
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
    setSavedNote("");
    setPhase("offer-pdf");
  }

  /** "Save PDF": a real PDF straight to Downloads (no print dialog). The screen stays open. */
  function savePdf(target = next) {
    const closedDate = target?.closedDate ?? closingDate();
    setSaving(true);
    void saveDailyPdf(closedDate).then((ok) => {
      setSaving(false);
      if (!ok) {
        // Could not build the file here: fall back to the print dialog.
        setSavedNote("Couldn’t save a PDF here, so the print window opened. Choose Save as PDF there.");
        printSheet(target);
        return;
      }
      setSavedNote("Saved. Look in your Downloads folder.");
    });
  }

  /** "Print": the browser print dialog for the closed day. The screen stays open. */
  function printSheet(target = next) {
    const closedDate = target?.closedDate ?? closingDate();
    // Land on the closed day's Daily OS so it is what prints, then offer Save as PDF.
    void navigate({ to: "/daily", search: { date: closedDate } }).then(() => {
      window.setTimeout(() => printDaily(closedDate), 200);
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
    if (phase !== "confirm" && phase !== "offer-pdf" && phase !== "notice") return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (phase === "confirm" || phase === "notice") dismissConfirm();
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
          disabled={unavailable}
          aria-disabled={unavailable || undefined}
          style={unavailable ? { opacity: 0.4 } : undefined}
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
            unavailable && "pointer-events-none cursor-not-allowed opacity-40",
            className,
          )}
          onClick={unavailable ? undefined : startClose}
          disabled={unavailable}
          aria-disabled={unavailable || undefined}
          // Inline too, so the greyed look can't be lost to class order.
          style={unavailable ? { opacity: 0.4 } : undefined}
          title={unavailable ? (viewedOff ? "Day off: Close day is off" : "Close day opens on that day") : undefined}
          aria-haspopup="dialog"
        >
          <Moon className="size-5" strokeWidth={1.8} />
          Close day
          {unavailable ? (
            <span className="sr-only">{viewedOff ? " (day off)" : " (not today yet)"}</span>
          ) : null}
        </button>
      )}

      {phase === "week-plan" ? (
        <WeeklyPlannerSheet onDone={afterWeekPlan} date={closingDate()} />
      ) : null}

      {phase === "friday-review" ? (
        <FridayReviewSheet onDone={afterFridayReview} date={closingDate()} />
      ) : null}

      {phase === "week-rating" ? (
        <WeekRatingSheet onDone={afterWeekRating} date={closingDate()} askKind={askKind} />
      ) : null}

      {phase === "notice" && notice ? (
        <SheetPortal>
          <div
            className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-day-notice-title"
            onClick={dismissConfirm}
          >
            <div
              className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                End of day
              </p>
              <h2 id="close-day-notice-title" className="mt-1 font-display text-2xl text-olive">
                {notice.title}
              </h2>
              <p className="mt-2 text-ink">{notice.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {notice.showBlocks ? (
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-4 text-sm font-semibold text-cream"
                    onClick={() => {
                      setPhase("idle");
                      void navigate({ to: "/daily", search: { date: closingDate() } });
                    }}
                  >
                    Show me my blocks
                  </button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-yellow bg-paper px-4 text-sm font-semibold text-olive"
                  onClick={dismissConfirm}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </SheetPortal>
      ) : null}

      {phase === "confirm" ? (
        <SheetPortal>
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
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
                This marks today done and saves it in your history. Then it{" "}
                {alreadySaved
                  ? "opens your next work day."
                  : "offers Save PDF or Print, then opens your next work day."}
                {" "}During week one, your Shutdown note and Other things I did today are also copied into the
                starter day’s “one line.”
              </p>
              {alreadySaved ? (
                <>
                  <p className="mt-2 text-sm text-olive">
                    You opened Save PDF or Print for this day a few minutes ago, so it won’t ask again.
                  </p>
                  <BeforeYouGo />
                </>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-4 text-sm font-semibold text-cream"
                onClick={runClose}
              >
                {`Close day, then ${prettyDate(nextDateAfterClose(closingDate()))}`}
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
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
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
                opens your printer. You can do both.
              </p>
              <p className="mt-2 text-ink">Your notes stay on this device either way.</p>
              {savedNote ? (
                <p role="status" className="mt-2 text-sm font-semibold text-olive">
                  {savedNote}
                </p>
              ) : null}
              <BeforeYouGo />
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
                className="inline-flex h-11 items-center justify-center rounded-md border border-olive bg-paper px-4 text-sm font-semibold text-olive"
                disabled={saving}
                onClick={() => savePdf()}
              >
                {saving ? "Saving…" : "Save PDF"}
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md border border-olive bg-paper px-4 text-sm font-semibold text-olive"
                disabled={saving}
                onClick={() => printSheet()}
              >
                Print
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-4 text-sm font-semibold text-cream"
                onClick={advance}
              >
                {next?.nextDate ? `Done, go to ${prettyDate(next.nextDate)}` : "Done, go to next work day"}
              </button>
            </div>
          </div>
        </div>
        </SheetPortal>
      ) : null}
    </>
  );
}
