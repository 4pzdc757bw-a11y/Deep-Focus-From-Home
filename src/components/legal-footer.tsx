import { Link } from "@tanstack/react-router";
import { BUSINESS_ADDRESS, BUSINESS_EMAIL, BUSINESS_NAME, LEGAL_LINKS } from "@/lib/legal";

export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`border-t border-yellow/80 pt-4 text-sm text-muted ${className}`}
    >
      <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Legal">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="font-semibold text-olive hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-xs tracking-wide">
        {BUSINESS_NAME} · {BUSINESS_ADDRESS} · {BUSINESS_EMAIL}
      </p>
    </footer>
  );
}
