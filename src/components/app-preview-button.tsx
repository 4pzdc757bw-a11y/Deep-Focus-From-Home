import { Play } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Button } from "@/components/ui/button";

// The carousel (and its slide images) only load when someone clicks
// "Preview the app", so the offer pages stay as fast as before.
//
// Browser-only: the carousel never renders on the server (it starts closed),
// and keeping this dynamic import out of the SSR bundle avoids a Rolldown
// chunking bug that left the deployed server entry exporting an undefined
// `ssr_exports`, so every page answered 500 on Vercel.
const loadCarousel = (): Promise<{
  default: ComponentType<{ onClose: () => void }>;
}> =>
  import.meta.env.SSR
    ? Promise.resolve({ default: () => null })
    : import("@/components/app-preview-carousel");

const AppPreviewCarousel = lazy(loadCarousel);

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
        onPointerEnter={() => void loadCarousel()}
        onFocus={() => void loadCarousel()}
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
