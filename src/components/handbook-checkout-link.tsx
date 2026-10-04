import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";
import { STRIPE_APP_PAYMENT_LINK, STRIPE_HANDBOOK_PAYMENT_LINK } from "@/lib/offer";

/** "Get the handbook" on the home page: straight to the $17 Stripe checkout (falls back to /buy if the link isn't configured). Forwards props so <Button asChild> styling applies. */
export function HandbookCheckoutLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (STRIPE_HANDBOOK_PAYMENT_LINK) {
    return <a {...props} href={STRIPE_HANDBOOK_PAYMENT_LINK} rel="noopener noreferrer" />;
  }
  const { href: _h, ...rest } = props;
  return <Link {...rest} to="/buy" />;
}

/** "Add the app" buy buttons: straight to the $37 Stripe checkout (falls back to /app if the link isn't configured). */
export function AppCheckoutLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (STRIPE_APP_PAYMENT_LINK) {
    return <a {...props} href={STRIPE_APP_PAYMENT_LINK} rel="noopener noreferrer" />;
  }
  const { href: _h, ...rest } = props;
  return <Link {...rest} to="/app" />;
}
