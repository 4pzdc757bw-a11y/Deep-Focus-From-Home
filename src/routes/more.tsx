import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Battery,
  CalendarRange,
  CircleHelp,
  ClipboardList,
  Home,
  Megaphone,
  NotebookPen,
  Scale,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Card, PageTitle } from "@/components/app-shell";
import { InstallCard } from "@/components/install-card";
import { LegalFooter } from "@/components/legal-footer";
import { Button } from "@/components/ui/button";
import { downloadBackup, importBackup } from "@/lib/backup";

export const Route = createFileRoute("/more")({ component: MorePage });

const LINKS = [
  {
    to: "/intro",
    title: "How this works + FAQ",
    copy: "The program in four steps. Common questions.",
    icon: CircleHelp,
  },
  {
    to: "/daily",
    title: "Daily operating system",
    copy: "Outcomes, block, checks, shutdown.",
    icon: NotebookPen,
  },
  {
    to: "/energy",
    title: "Energy and focus log",
    copy: "Find the two-hour peak.",
    icon: Battery,
  },
  {
    to: "/week",
    title: "Weekly deep-work planner",
    copy: "Four blocks and one coworking slot.",
    icon: CalendarRange,
  },
  {
    to: "/setup",
    title: "Home focus setup",
    copy: "Surface, light, morning, shutdown.",
    icon: Home,
  },
  {
    to: "/household",
    title: "Household agreement",
    copy: "Hours, signal, emergency, kid version.",
    icon: Users,
  },
  {
    to: "/month",
    title: "Monthly review",
    copy: "Keep one change. Drop the rest.",
    icon: ClipboardList,
  },
] as const;

function MorePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        kicker="Tools"
        title="The rest of the system"
        lede="This app is the companion to the Deep Focus from Home handbook. The book is the why. These pages are the forms. Saved on this device — export a copy so it cannot vanish."
      />
      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Keep a copy
        </p>
        <p className="text-ink">
          Download your notes as a file. Import that file if you switch phones.
          Print the household agreement from its page for the fridge.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadBackup}>
            Export notes
          </Button>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            Import notes
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void file.text().then((text) => {
              try {
                importBackup(JSON.parse(text));
                setStatus("Imported. Your notes are on this device.");
              } catch {
                setStatus("That file could not be read.");
              }
            });
          }}
        />
        {status ? <p className="text-sm text-olive">{status}</p> : null}
      </Card>
      {/* Primary funnel CTA — same olive fill as /buy handbook & app buttons */}
      <Button asChild className="h-auto w-full justify-start gap-3 whitespace-normal px-4 py-4 text-left">
        <Link to="/start">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-cream/15 text-cream">
            <Megaphone className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-xl font-normal text-cream">Start here</span>
            <span className="mt-1 block text-sm font-normal tracking-normal text-cream/85">
              The public funnel: free 7-day pack, then the $17 handbook or the $37 app.
            </span>
          </span>
        </Link>
      </Button>
      {LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.to}
            asChild
            variant="outline"
            className="h-auto w-full justify-start gap-3 whitespace-normal border-olive/35 bg-sage/50 px-4 py-3.5 text-left hover:bg-cream"
          >
            <Link to={item.to}>
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-olive text-cream">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-normal text-olive">{item.title}</span>
                <span className="mt-1 block text-sm font-normal tracking-normal text-ink">{item.copy}</span>
              </span>
            </Link>
          </Button>
        );
      })}
      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Legal
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/terms" className="flex items-center gap-3 font-semibold text-olive">
            <span className="grid size-9 place-items-center rounded-md bg-sage text-olive">
              <Scale className="size-4" />
            </span>
            Terms of Service
          </Link>
          <Link to="/privacy" className="flex items-center gap-3 font-semibold text-olive">
            <span className="grid size-9 place-items-center rounded-md bg-sage text-olive">
              <Scale className="size-4" />
            </span>
            Privacy Policy
          </Link>
          <Link to="/store-credit" className="flex items-center gap-3 font-semibold text-olive">
            <span className="grid size-9 place-items-center rounded-md bg-sage text-olive">
              <Scale className="size-4" />
            </span>
            Store Credit Policy
          </Link>
        </div>
      </Card>
      <InstallCard />
      <LegalFooter />
    </div>
  );
}
