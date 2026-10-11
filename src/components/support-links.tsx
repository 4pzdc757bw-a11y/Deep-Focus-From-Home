import { Link } from "@tanstack/react-router";
import { Download, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS_EMAIL } from "@/lib/legal";

/** Visible "Contact support" button (opens the buyer's email app). */
export function ContactSupportButton({ className }: { className?: string }) {
  return (
    <Button variant="outline" asChild className={className}>
      <a href={`mailto:${BUSINESS_EMAIL}`}>
        <LifeBuoy className="size-4" /> Contact support
      </a>
    </Button>
  );
}

/** Button to the "My downloads" page (fresh handbook download links). */
export function MyDownloadsButton({ className }: { className?: string }) {
  return (
    <Button variant="outline" asChild className={className}>
      <Link to="/my-downloads">
        <Download className="size-4" /> My downloads
      </Link>
    </Button>
  );
}

/** Small text link to "My downloads" for pages that already have many buttons. */
export function MyDownloadsTextLink({ className }: { className?: string }) {
  return (
    <Link
      to="/my-downloads"
      className={
        className ??
        "inline-flex min-h-11 items-center text-sm font-semibold text-olive underline underline-offset-4"
      }
    >
      My downloads
    </Link>
  );
}
