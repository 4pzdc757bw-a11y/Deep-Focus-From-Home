/**
 * Paid handbook download catalog (client-safe).
 * Binary files live under private/downloads/handbook/ — never public/.
 */

export const DOWNLOAD_FILE_KEYS = [
  "handbook-desktop",
  "handbook-mobile",
  "fillables",
] as const;

export type DownloadFileKey = (typeof DOWNLOAD_FILE_KEYS)[number];

export type DownloadFileMeta = {
  key: DownloadFileKey;
  /** Filename under private/downloads/handbook/ */
  filename: string;
  label: string;
  contentType: string;
};

export const DOWNLOAD_FILES: Record<DownloadFileKey, DownloadFileMeta> = {
  "handbook-desktop": {
    key: "handbook-desktop",
    filename: "Deep_Focus_from_Home.pdf",
    label: "Download handbook (desktop PDF)",
    contentType: "application/pdf",
  },
  "handbook-mobile": {
    key: "handbook-mobile",
    filename: "Deep_Focus_from_Home_Mobile.pdf",
    label: "Download handbook (phone PDF)",
    contentType: "application/pdf",
  },
  fillables: {
    key: "fillables",
    filename: "Fillables.zip",
    label: "Download fillable worksheets (ZIP)",
    contentType: "application/zip",
  },
};

export const DOWNLOAD_FILE_LIST: DownloadFileMeta[] = DOWNLOAD_FILE_KEYS.map(
  (key) => DOWNLOAD_FILES[key],
);

export function isDownloadFileKey(raw: unknown): raw is DownloadFileKey {
  return (
    typeof raw === "string" &&
    (DOWNLOAD_FILE_KEYS as readonly string[]).includes(raw)
  );
}

/** Support contact when checkout session id is missing. */
export const DOWNLOAD_SUPPORT_EMAIL = "support@jeffsebiz.com";
