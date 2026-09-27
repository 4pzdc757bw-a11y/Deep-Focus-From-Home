import { createPortal } from "react-dom";

/**
 * Mount sheet overlays on document.body so `position: fixed` is not trapped
 * by ancestors with `transform` / `filter` / `backdrop-filter` (e.g. the
 * bottom nav's backdrop-blur). Without this, `fixed inset-0` is sized to the
 * nav (~56px) and action buttons sit off-screen.
 */
export function SheetPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
