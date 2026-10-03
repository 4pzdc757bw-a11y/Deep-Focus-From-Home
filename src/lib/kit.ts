/** Kit (email) public form helpers — no API key; the form endpoint is public. */
export const KIT_FORM_ID = "9995411";
export const KIT_FORM_ACTION = `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`;
export const STARTER_SIGNUP_SUCCESS =
  "Check your inbox. Tap the confirm link and Day 1 is on its way.";
export const KIT_ORIGIN = "https://app.kit.com";

export type KitResult =
  | { ok: true; guardUrl?: string }
  | { ok: false; message?: string };

/** Only follow Kit's own security-check pages. */
export function safeGuardUrl(url: unknown): string | undefined {
  return typeof url === "string" && url.startsWith(`${KIT_ORIGIN}/`) ? url : undefined;
}

/**
 * Kit answers {status:"success"}, {status:"quarantined", url} (its bot check —
 * the visitor must pass it in an iframe before the subscribe counts), or
 * {status:"failed", errors}. A consent step can also arrive as consent.url.
 */
export function readKitResponse(
  ok: boolean,
  data: { status?: string; url?: string; consent?: { enabled?: boolean; url?: string }; errors?: { messages?: string[] } } | null,
): KitResult {
  if (!ok || !data || data.status === "failed") {
    return { ok: false, message: data?.errors?.messages?.[0] };
  }
  if (data.status === "quarantined") {
    const guardUrl = safeGuardUrl(data.url);
    return guardUrl ? { ok: true, guardUrl } : { ok: false };
  }
  if (data.status === "success") {
    const consentUrl = data.consent?.enabled ? safeGuardUrl(data.consent.url) : undefined;
    return consentUrl ? { ok: true, guardUrl: consentUrl } : { ok: true };
  }
  return { ok: false };
}

export async function submitToKit(firstName: string, email: string): Promise<KitResult> {
  const body = new FormData();
  body.append("email_address", email.trim());
  body.append("fields[first_name]", firstName.trim());
  try {
    const res = await fetch(KIT_FORM_ACTION, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    });
    const data = await res.json().catch(() => null);
    return readKitResponse(res.ok, data);
  } catch {
    return { ok: false };
  }
}

