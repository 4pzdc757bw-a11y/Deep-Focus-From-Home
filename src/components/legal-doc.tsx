import { Link } from "@tanstack/react-router";
import { Card, PageTitle } from "@/components/app-shell";
import { LegalFooter } from "@/components/legal-footer";
import {
  FIX_IT_HEADING,
  FIX_IT_INTRO,
  FIX_IT_ITEMS,
  FIX_IT_REPLY,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LINKS,
} from "@/lib/legal";

/** The fix-it rule, word for word the same on Store Credit and Terms §8. */
export function FixItRule({ as: Heading = "h2" }: { as?: "h2" | "h3" }) {
  return (
    <>
      <Heading>{FIX_IT_HEADING}</Heading>
      <p>{FIX_IT_INTRO}</p>
      <ul>
        {FIX_IT_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>{FIX_IT_REPLY}</p>
    </>
  );
}

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
