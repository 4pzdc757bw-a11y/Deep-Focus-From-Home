# Private downloads

Files here are **not** served by the static host / CDN.

Paid handbook PDFs and fillables live under `downloads/handbook/` and are only
delivered by `/api/download` after Stripe Checkout Session verification (or a
short-lived signed URL minted after that check).

The free starter pack stays in `public/downloads/7-day-starter-pack.pdf`.
