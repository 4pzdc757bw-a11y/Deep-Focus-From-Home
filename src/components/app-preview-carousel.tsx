import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppCheckoutLink } from "@/components/handbook-checkout-link";
import { SheetPortal } from "@/components/sheet-portal";
import { Button } from "@/components/ui/button";
import { APP_PRICE_LABEL } from "@/lib/offer";

const SLIDE_MS = 4000;
const IMG_BASE = "/images/app-preview";

/** Slide copy and alt text come from Sarah's approved carousel copy (copy.txt, Oct 4 2026). */
const SLIDES: { n: string; label: string; alt: string }[] = [
  {
    n: "01",
    label: "The workday at home, scattered",
    alt: "Working from home: The workday at home, scattered. Laundry at 10. Inbox at 10:05. The fridge, the door, the dog. Where did the morning go? Scattered notes read Inbox (47), Laundry, Fridge again, Dog at the door, Where was I?, One more email.",
  },
  {
    n: "02",
    label: "Today's planner and focus bell",
    alt: "Today's planner, Daily OS: Plan today. Ring the bell. Pick 1–3 outcomes and one focus block. The bell rings when the block ends. If you lock the phone, it rings when you open the app again. Screenshot of the app's Today screen.",
  },
  {
    n: "03",
    label: "Weekly planner",
    alt: "Weekly planner: Park the week's blocks. Name the week's outcome and set your Mon–Fri deep-work blocks: day, time, task. Screenshot of the app's weekly planner.",
  },
  {
    n: "04",
    label: "Energy log",
    alt: "Energy log: Log your energy. Spot patterns. Tap a quick check-in after a block. Your check-ins show your peak window. Screenshot of the app's energy log.",
  },
  {
    n: "05",
    label: "Close Day",
    alt: "Close day: Close the day. Done. Close day marks today done, keeps it in your history and moves you to your next work day. Screenshot of the app's Close day step.",
  },
  {
    n: "06",
    label: "Get the app, $37",
    alt: "Deep Focus from Home: Get the app, $37. Runs in your phone or computer browser, nothing to install, handbook included. Shown next to a screenshot of the app's home screen with today's operating system and a live focus block.",
  },
];

const LAST = SLIDES.length - 1;

function preload(i: number) {
  const s = SLIDES[i];
  if (!s) return;
  const wide = window.matchMedia("(min-width: 640px)").matches;
  const img = new Image();
  img.src = `${IMG_BASE}/${wide ? "wide" : "square"}-${s.n}.webp`;
}

/** Accessible lightbox carousel of the 6 app preview slides. Loaded lazily by PreviewAppButton. */
export default function AppPreviewCarousel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Auto-play stops on the last slide so the $37 button stays put.
  const playing = !userPaused && !hoverPaused && !reducedMotion && index < LAST;

  const go = useCallback((i: number) => {
    setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);
  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length),
    [],
  );

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(next, SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [playing, index, next]);

  useEffect(() => {
    preload(index + 1);
  }, [index]);

  // Lock page scroll and move focus into the dialog while it is open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "Tab") {
      // Keep keyboard focus inside the dialog.
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      setUserPaused(true);
      if (dx < 0) next();
      else prev();
    }
  }

  const slide = SLIDES[index]!;
  const isLast = index === LAST;

  return (
    <SheetPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-3 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-preview-title"
          aria-roledescription="carousel"
          onKeyDown={onKeyDown}
          className="flex max-h-full w-full max-w-[min(100%,calc(100dvh-14rem))] flex-col gap-3 overflow-y-auto rounded-lg bg-paper p-3 shadow-2xl sm:max-w-[min(64rem,calc((100dvh-12rem)*1.78))] sm:p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="app-preview-title"
                className="font-display text-xl leading-tight text-olive"
              >
                Deep Focus from Home™ app preview
              </h2>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                by Jeffsebiz
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close app preview"
              className="grid size-11 shrink-0 place-items-center rounded-md text-olive hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <X className="size-5" />
            </button>
          </div>

          <div
            className="relative overflow-hidden rounded-md bg-cream"
            aria-live={playing ? "off" : "polite"}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setHoverPaused(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setHoverPaused(false);
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={(e) => {
              // Tap on the slide (touch/pen) toggles pause.
              if ((e.nativeEvent as PointerEvent).pointerType !== "mouse") {
                setUserPaused((p) => !p);
              }
            }}
          >
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${SLIDES.length}: ${slide.label}`}
            >
              <picture key={slide.n}>
                <source
                  media="(min-width: 640px)"
                  srcSet={`${IMG_BASE}/wide-${slide.n}.webp`}
                  width={1920}
                  height={1080}
                />
                <img
                  src={`${IMG_BASE}/square-${slide.n}.webp`}
                  width={1080}
                  height={1080}
                  alt={slide.alt}
                  decoding="async"
                  className="block aspect-square h-auto w-full select-none sm:aspect-video"
                  draggable={false}
                />
              </picture>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous slide"
              className="absolute top-1/2 left-2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 sm:grid text-olive shadow hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next slide"
              className="absolute top-1/2 right-2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-paper/90 sm:grid text-olive shadow hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <ChevronRight className="size-6" />
            </button>
          </div>

          <div className="flex min-h-11 items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
              className="grid size-11 shrink-0 place-items-center rounded-md text-olive hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {userPaused ? (
                <Play className="size-5" />
              ) : (
                <Pause className="size-5" />
              )}
            </button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous slide"
                className="grid size-11 place-items-center rounded-md text-olive hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:hidden"
              >
                <ChevronLeft className="size-6" />
              </button>
              <div
                className="flex items-center"
                role="group"
                aria-label="Choose a slide"
              >
                {SLIDES.map((s, i) => (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => {
                      setUserPaused(true);
                      go(i);
                    }}
                    aria-label={`Slide ${i + 1}: ${s.label}`}
                    aria-current={i === index ? "true" : undefined}
                    className="grid size-7 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:size-8"
                  >
                    <span
                      className={
                        i === index
                          ? "block size-3 rounded-full bg-olive"
                          : "block size-3 rounded-full border-2 border-olive/60"
                      }
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="grid size-11 place-items-center rounded-md text-olive hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:hidden"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>
            <span className="hidden min-w-11 shrink-0 text-right text-sm text-muted sm:inline">
              {index + 1}/{SLIDES.length}
            </span>
          </div>
          {isLast ? (
            <Button
              asChild
              size="lg"
              className="w-full sm:mx-auto sm:w-auto sm:min-w-64"
            >
              <AppCheckoutLink>Get the app — {APP_PRICE_LABEL}</AppCheckoutLink>
            </Button>
          ) : null}
        </div>
      </div>
    </SheetPortal>
  );
}
