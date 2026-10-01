# Paid download lockdown

Paid handbook files are **not** in `public/`. They live under
`private/downloads/handbook/` and are only delivered by `/api/download` after
Stripe verifies the Checkout Session (or via a short-lived HMAC URL minted
after that check).

## Env vars (Vercel — never paste keys in chat)

| Variable | Required | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes (to unlock) | Create a **restricted** Stripe secret key with **Checkout Sessions: Read**. Request via Grok Bot secret-request flow into Vercel env. |
| `DOWNLOAD_SIGNING_SECRET` | Optional | Random high-entropy string for HMAC download links. If unset, the server derives a signing secret from `STRIPE_SECRET_KEY`. |

If `STRIPE_SECRET_KEY` is unset, `/api/download` **fails closed** (503/401) —
no file leak. The free starter PDF at `/downloads/7-day-starter-pack.pdf`
keeps working.

## Stripe Payment Link success URLs (Jeffrey edits in Stripe Dashboard)

Use the exact Stripe placeholder `{CHECKOUT_SESSION_ID}`:

- Handbook: `https://deepfocus.jeffsebiz.com/thanks?paid=1&product=handbook&session_id={CHECKOUT_SESSION_ID}`
- App: `https://deepfocus.jeffsebiz.com/thanks?paid=1&product=app&session_id={CHECKOUT_SESSION_ID}`

(`/access?product=…&session_id={CHECKOUT_SESSION_ID}` also forwards the session id to `/thanks`.)

## After merge

1. Set the restricted Stripe secret key in Vercel (and optional signing secret).
2. Update both Payment Link success URLs as above.
3. Redeploy.
4. One **refunded** test purchase: confirm thanks page buttons download, and
   raw `/downloads/handbook/…` URLs 404.
