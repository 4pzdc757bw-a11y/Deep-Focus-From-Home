/** Monday-start week of a YYYY-MM-DD day (same rule as weekKey in utils). */
function weekOf(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow + (dow === 0 ? -6 : 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Friday review question rules (Owner decision C, Oct 11, 2026). */

export type ReviewAsks = { first?: string; month?: string };
export type ReviewKind = "first" | "month";

/** A real review is asked for only twice: after the first full work week, then a month later. */
export const MIN_CLOSED_DAYS_FIRST = 3;
export const DAYS_BETWEEN_ASKS = 28;

/** How many days of the week containing `date` are already closed. */
export function closedDaysInWeek(
  dailies: Record<string, { closed?: boolean } | undefined>,
  date: string,
): number {
  const wk = weekOf(date);
  let n = 0;
  for (const [k, v] of Object.entries(dailies)) {
    if (!v?.closed) continue;
    if (weekOf(k) === wk) n += 1;
  }
  return n;
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Which review ask is due at this Friday close, or null. `closedBefore` is the
 * count of already-closed days this week; the day being closed counts as one more.
 * Asked of everyone who reaches it, whatever the 1-to-5 answer was.
 */
export function reviewAskDue(opts: {
  asks: ReviewAsks | undefined;
  closedBefore: number;
  date: string;
}): ReviewKind | null {
  const asks = opts.asks ?? {};
  if (!asks.first) {
    return opts.closedBefore + 1 >= MIN_CLOSED_DAYS_FIRST ? "first" : null;
  }
  if (!asks.month && daysBetween(asks.first, opts.date) >= DAYS_BETWEEN_ASKS) return "month";
  return null;
}

export const REVIEW_EMAIL = "support@deepfocusfromhome.com";

/** mailto link for the review. Nothing is sent from the app itself. */
export function reviewMailto(opts: { stars: number; line: string; share: boolean }): string {
  const body = [
    `My rating for the week: ${opts.stars} out of 5`,
    "",
    opts.line.trim() ? `My review: ${opts.line.trim()}` : "My review: (no comment)",
    "",
    opts.share
      ? "Yes, you may share this review on your website and in your marketing."
      : "Please do not share this review. It is private feedback.",
  ].join("\n");
  const subject = "My Deep Focus from Home review";
  return `mailto:${REVIEW_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
