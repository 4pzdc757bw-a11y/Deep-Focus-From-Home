/** Client-safe download error types and helpers. */

export class DownloadConfigError extends Error {
  readonly code = "download_config" as const;
  constructor(message: string) {
    super(message);
    this.name = "DownloadConfigError";
  }
}

export class DownloadAuthError extends Error {
  readonly code = "download_auth" as const;
  constructor(message: string) {
    super(message);
    this.name = "DownloadAuthError";
  }
}

export function downloadErrorMessage(err: unknown): string {
  if (err instanceof DownloadAuthError || err instanceof DownloadConfigError) {
    return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Download is unavailable right now. Email support@jeffsebiz.com with the receipt email you got when you paid.";
}

export function downloadErrorStatus(err: unknown): number {
  if (err instanceof DownloadConfigError) return 503;
  if (err instanceof DownloadAuthError) return 401;
  return 500;
}
