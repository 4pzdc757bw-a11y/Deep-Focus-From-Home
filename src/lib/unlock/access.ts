/**
 * Client-safe paywall rules: which paths are free, which need the handbook,
 * which need the app. The server decides who has what (signed cookie); this
 * file only maps a path to the access it requires.
 */

export type UnlockProduct = "handbook" | "app";
export type AccessNeed = "none" | UnlockProduct;

/** Free pages (marketing, legal, checkout landing, guide index). */
const FREE_PATHS = new Set([
  "/",
  "/intro",
  "/buy",
  // Unlinked $37 app offer page (only the Day 5/7 emails link here).
  "/app",
  "/start",
  "/more",
  "/terms",
  "/privacy",
  "/thanks",
  "/access",
  "/store-credit",
  "/guide",
  // The free 7-day pack (from /start) is the starter week: readable without
  // buying. Its "Open Day N OS" links to the Daily OS stay app-only.
  "/starter",
]);

/** Guide chapters readable without a purchase (free sample). */
export const FREE_CHAPTER_SLUGS = new Set(["intro"]);

function normalizePath(pathname: string): string {
  const p = (pathname || "/").split("?", 1)[0]!.split("#", 1)[0]!;
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "") || "/";
  return p;
}

/**
 * Fail closed: anything not listed as free is an app tool, so new tool
 * routes are locked by default.
 */
export function requiredAccessForPath(pathname: string): AccessNeed {
  const path = normalizePath(pathname);
  if (FREE_PATHS.has(path)) return "none";
  if (path.startsWith("/guide/")) {
    const slug = decodeURIComponent(path.slice("/guide/".length));
    return FREE_CHAPTER_SLUGS.has(slug) ? "none" : "handbook";
  }
  return "app";
}

/** The app includes everything in the handbook. */
export function hasAccess(
  product: UnlockProduct | null | undefined,
  need: AccessNeed,
): boolean {
  if (need === "none") return true;
  if (product === "app") return true;
  return product === "handbook" && need === "handbook";
}

/** Higher of two unlocks (app beats handbook). */
export function bestProduct(
  a: UnlockProduct | null | undefined,
  b: UnlockProduct | null | undefined,
): UnlockProduct | null {
  if (a === "app" || b === "app") return "app";
  if (a === "handbook" || b === "handbook") return "handbook";
  return null;
}
