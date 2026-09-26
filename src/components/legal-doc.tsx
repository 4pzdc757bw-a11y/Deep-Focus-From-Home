import { Link } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { LegalFooter } from "@/components/legal-footer";
import { LEGAL_EFFECTIVE_DATE, LEGAL_LINKS } from "@/lib/legal";

export function LegalDoc({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker={kicker}
        title={title}
        lede={`Effective date: ${LEGAL_EFFECTIVE_DATE}`}
      />
      <Card className="flex flex-col gap-4 text-ink [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-olive [&_h2]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_a]:font-semibold [&_a]:text-olive [&_a]:underline">
        {children}
      </Card>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Other policies">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="font-semibold text-olive">
            {link.label}
          </Link>
        ))}
      </nav>
      <LegalFooter />
    </div>
  );
}
