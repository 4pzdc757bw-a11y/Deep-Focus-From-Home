import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DOWNLOAD_FILES,
  type DownloadFileKey,
  type DownloadFileMeta,
} from "./catalog";
import { DownloadAuthError, DownloadConfigError } from "./errors";

function toUint8Array(raw: unknown): Uint8Array | null {
  if (raw == null) return null;
  if (raw instanceof Uint8Array) return raw;
  if (Buffer.isBuffer(raw)) return new Uint8Array(raw);
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (ArrayBuffer.isView(raw)) {
    const view = raw as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  return null;
}

/**
 * Load a paid handbook file from Nitro serverAssets (production) or
 * private/downloads/handbook on disk (vite dev).
 */
export async function readPaidDownloadFile(
  key: DownloadFileKey,
): Promise<{ meta: DownloadFileMeta; bytes: Uint8Array }> {
  const meta = DOWNLOAD_FILES[key];
  if (!meta) {
    throw new DownloadAuthError("Unknown download file.");
  }

  // Production (Nitro): assets registered via vite nitro serverAssets.
  try {
    const { useStorage } = await import("nitro/storage");
    const storage = useStorage("assets:downloads");
    const raw = await storage.getItemRaw(`handbook/${meta.filename}`);
    const bytes = toUint8Array(raw);
    if (bytes && bytes.byteLength > 0) {
      return { meta, bytes };
    }
  } catch (err) {
    // Expected in vite dev where Nitro is not mounted.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[downloads] nitro/storage read missed; falling back to filesystem:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Dev / fallback: read from private/ (not served as static).
  const diskPath = join(
    process.cwd(),
    "private",
    "downloads",
    "handbook",
    meta.filename,
  );
  try {
    const buf = await readFile(diskPath);
    return { meta, bytes: new Uint8Array(buf) };
  } catch (err) {
    console.error("[downloads] Failed to read private file:", diskPath, err);
    throw new DownloadConfigError(
      "Paid download file is missing on the server. Contact support@deepfocusfromhome.com with your receipt.",
    );
  }
}

export function downloadResponse(
  meta: DownloadFileMeta,
  bytes: Uint8Array,
): Response {
  // Copy into a fresh ArrayBuffer-backed Uint8Array for BodyInit typing.
  const body = new Uint8Array(bytes.byteLength);
  body.set(bytes);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": meta.contentType,
      "Content-Disposition": `attachment; filename="${meta.filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
