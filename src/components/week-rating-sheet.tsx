import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { SheetPortal } from "@/components/sheet-portal";
import { Field, Textarea } from "@/components/ui/input";
import { useFocusStore } from "@/lib/store";
import { reviewMailto, type ReviewKind } from "@/lib/review-ask";
import { weekKey } from "@/lib/utils";

const LABELS = ["Rough", "Meh", "Okay", "Good", "Great"];

/**
 * Friday Close day, after the Friday review: one 1-to-5 click question about
 * the week. Twice only (after the first full work week, then a month later) a
 * second screen asks for a real review: a few clicks, an optional one-liner,
 * and a box giving permission to share it. Skip is one click and never blocks Close.
 * Nothing is sent from the app: the review opens as an email the buyer sends.
 */
export function WeekRatingSheet({
  onDone,
  date,
  askKind,
}: {
  onDone: () => void;
  date: string;
  askKind: ReviewKind | null;
}) {
  const titleId = useId();
  const key = weekKey(new Date(`${date}T12:00:00`));
  const patchWeek = useFocusStore((s) => s.patchWeek);
  const markReviewAsked = useFocusStore((s) => s.markReviewAsked);
  const [stars, setStars] = useState<number>(() => useFocusStore.getState().weeks[key]?.weekRating ?? 0);
  const [step, setStep] = useState<"rate" | "review">("rate");
  const [line, setLine] = useState("");
  const [share, setShare] = useState(false);

  function pick(n: number) {
    setStars(n);
    patchWeek(key, { weekRating: n });
    if (askKind) {
      markReviewAsked(askKind, date);
      setStep("review");
    } else {
      onDone();
    }
  }

  return (
    <SheetPortal>
      <div
        className="no-print fixed inset-0 z-50 flex items-center justify-center bg-olive/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex max-h-[min(92vh,40rem)] w-full max-w-md flex-col rounded-lg border border-yellow bg-cream p-5 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            {step === "rate" ? "One quick question" : "Your review"}
          </p>
          {step === "rate" ? (
            <>
              <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
                How did this week go?
              </h2>
              <p className="mt-2 text-ink">Click one number, 1 is rough and 5 is great.</p>
              <div className="mt-4 grid grid-cols-5 gap-2" role="group" aria-label="Rate this week from 1 to 5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={stars === n ? "default" : "outline"}
                    className="h-14 flex-col gap-0 px-0"
                    aria-label={`${n} out of 5, ${LABELS[n - 1]}`}
                    onClick={() => pick(n)}
                  >
                    <span className="text-lg">{n}</span>
                    <span className="text-[10px] font-medium">{LABELS[n - 1]}</span>
                  </Button>
                ))}
              </div>
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={onDone}>
                  Skip
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 id={titleId} className="mt-1 font-display text-2xl text-olive">
                Would you share a review?
              </h2>
              <p className="mt-2 text-ink">
                Thanks for the {stars}. If Deep Focus from Home has helped, a short review helps other people find it.
                It takes a few clicks. Skip anytime.
              </p>
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                <Field label="One line, if you like (optional)">
                  <Textarea
                    value={line}
                    onChange={(e) => setLine(e.target.value)}
                    placeholder="What changed for you this week?"
                  />
                </Field>
                <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={share}
                    onChange={(e) => setShare(e.target.checked)}
                  />
                  <span>
                    Yes, you may share my review on your website and in your marketing. We only use reviews with
                    this box checked.
                  </span>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <a href={reviewMailto({ stars, line, share })} onClick={() => setTimeout(onDone, 0)}>
                    Click to email my review
                  </a>
                </Button>
                <Button type="button" variant="outline" onClick={onDone}>
                  No thanks
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted">
                This opens a new email to support@deepfocusfromhome.com. Nothing is sent until you send it.
              </p>
            </>
          )}
        </div>
      </div>
    </SheetPortal>
  );
}
