export async function shareOrCopy(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "shared" as const;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "shared" as const;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}
