/**
 * Client-safe result of "My downloads". Links are emailed, never returned.
 * Failures come back as data.
 */
export type MyDownloadsResult =
  | { ok: true; message: string }
  | { ok: false; error: string };
