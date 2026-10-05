import { Play } from "lucide-react";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// The carousel (and its slide images) only load when someone clicks
// "Preview the app", so the offer pages stay as fast as before.
const AppPreviewCarousel = lazy(
  () => import("@/components/app-preview-carousel"),
);

type Props = {
  className?: string;
  variant?: "default" | "outline";
};

/** "Preview the app" button for the $37 app offer: opens the 6-slide app preview carousel. */
export function PreviewAppButton({ className, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Give focus back to the button that opened the preview.
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={variant}
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        onPointerEnter={() => void import("@/components/app-preview-carousel")}
        onFocus={() => void import("@/components/app-preview-carousel")}
      >
        <Play className="size-4" aria-hidden="true" /> Preview the app
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <AppPreviewCarousel onClose={close} />
        </Suspense>
      ) : null}
    </>
  );
}
