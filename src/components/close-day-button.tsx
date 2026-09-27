import { useNavigate } from "@tanstack/react-router";
import { Moon } from "lucide-react";
import { useState } from "react";
import { closeDay } from "@/lib/close-day";
import { todayKey } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Rightmost bottom-nav action: confirm → copy shutdown note to starter day,
 * mark day done, offer Save PDF, advance to next starter day.
 */
export function CloseDayButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [offerPdf, setOfferPdf] = useState(false);
  const [next, setNext] = useState<{ nextDay: number | null; nextDate: string } | null>(
    null,
  );

  function runClose() {
    const result = closeDay(todayKey());
    setOpen(false);
    setNext({ nextDay: result.nextDay, nextDate: result.nextDate });
    setOfferPdf(true);
  }

  function savePdfThenAdvance() {
    setOfferPdf(false);
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
    setOfferPdf(false);
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
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <Moon className="size-5" strokeWidth={1.8} />
        Close day
      </button>

      {open ? (
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
                onClick={() => setOpen(false)}
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {offerPdf ? (
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
