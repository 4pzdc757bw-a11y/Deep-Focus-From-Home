import type { DownloadFileKey } from "./catalog.ts";

/** Client-safe result of "My downloads". Failures come back as data. */
export type MyDownloadsResult =
  | {
      ok: true;
      links: {
        key: DownloadFileKey;
        label: string;
        url: string;
        expiresAt: number;
      }[];
    }
  | { ok: false; error: string };
