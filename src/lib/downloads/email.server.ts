import { DOWNLOAD_SUPPORT_EMAIL } from "./catalog.ts";

export const DOWNLOADS_EMAIL_FROM =
  "Deep Focus from Home <support@deepfocusfromhome.com>";
export const DOWNLOADS_EMAIL_REPLY_TO = DOWNLOAD_SUPPORT_EMAIL;
export const DOWNLOADS_EMAIL_SUBJECT = "Your Deep Focus from Home downloads";
export const SITE_ORIGIN = "https://deepfocusfromhome.com";

export type EmailLink = { label: string; url: string };

export function buildDownloadsEmailText(links: EmailLink[]): string {
  const lines = links.map((l) => `${l.label}:\n${l.url}`).join("\n\n");
  return [
    "Here are your Deep Focus from Home downloads. Click each link to save the file.",
    "",
    lines,
    "",
    "Links expire in about 2 hours. You can always get new ones at deepfocusfromhome.com/my-downloads.",
    "",
    `Questions? Reply to this email or write to ${DOWNLOAD_SUPPORT_EMAIL}.`,
    "",
    "Deep Focus from Home",
  ].join("\n");
}

export type SendEmailFn = (message: {
  to: string;
  subject: string;
  text: string;
}) => Promise<void>;

/** Sends one plain-text email through Resend. Never logs the key. */
export const sendWithResend: SendEmailFn = async ({ to, subject, text }) => {
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: DOWNLOADS_EMAIL_FROM,
      to: [to],
      reply_to: DOWNLOADS_EMAIL_REPLY_TO,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}`);
  }
};
