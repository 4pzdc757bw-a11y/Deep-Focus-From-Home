import { createFileRoute } from "@tanstack/react-router";
import { isDownloadFileKey } from "@/lib/downloads/catalog";
import {
  downloadErrorMessage,
  downloadErrorStatus,
} from "@/lib/downloads/errors";
import { downloadResponse, readPaidDownloadFile } from "@/lib/downloads/files.server";
import { DownloadAuthError } from "@/lib/downloads/errors";
import { verifySignedDownloadParams } from "@/lib/downloads/signing.server";
import { assertPaidCheckoutSession } from "@/lib/downloads/stripe.server";

/**
 * Paid handbook download endpoint.
 *
 * Auth modes (either works):
 * 1) Signed URL: ?file=&exp=&sig=  (minted after Stripe verify via createServerFn)
 * 2) Session:    ?session_id=&file= (verify Stripe Checkout Session, then stream)
 *
 * Fail closed when STRIPE_SECRET_KEY is unset — never streams private files.
 */
export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const fileParam = url.searchParams.get("file") ?? "";
          const sessionId = url.searchParams.get("session_id") ?? "";
          const exp = url.searchParams.get("exp");
          const sig = url.searchParams.get("sig");

          if (!isDownloadFileKey(fileParam)) {
            throw new DownloadAuthError(
              "Unknown or missing download file. Use the buttons on the thanks page after checkout.",
            );
          }

          if (exp && sig) {
            verifySignedDownloadParams({
              file: fileParam,
              exp,
              sig,
            });
          } else if (sessionId) {
            await assertPaidCheckoutSession(sessionId);
          } else {
            throw new DownloadAuthError(
              "Missing download authorization. Open the thanks page from your Stripe payment confirmation (it includes a session id), or email support@deepfocusfromhome.com with your receipt.",
            );
          }

          const { meta, bytes } = await readPaidDownloadFile(fileParam);
          return downloadResponse(meta, bytes);
        } catch (err) {
          const status = downloadErrorStatus(err);
          const message = downloadErrorMessage(err);
          console.error("[api/download]", status, message);
          return Response.json(
            { error: message },
            {
              status,
              headers: { "Cache-Control": "private, no-store" },
            },
          );
        }
      },
    },
  },
});
