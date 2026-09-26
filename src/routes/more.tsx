import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Battery,
  CalendarRange,
  CircleHelp,
  ClipboardList,
  Home,
  Megaphone,
  NotebookPen,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Card, PageTitle } from "@/components/app-shell";
import { InstallCard } from "@/components/install-card";
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
      <Link to="/start" className="block">
        <Card className="flex items-start gap-3 transition-colors hover:bg-paper">
          <span className="grid size-11 place-items-center rounded-md bg-sage text-olive">
            <Megaphone className="size-5" />
          </span>
          <span>
            <span className="block font-display text-xl text-olive">Start here</span>
            <span className="mt-1 block text-ink">
              The public funnel: free 7-day pack, then the $17 handbook + fillables (optional $37 app).
            </span>
          </span>
        </Card>
      </Link>
      {LINKS.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.to} to={item.to} className="block">
            <Card className="flex items-start gap-3 transition-colors hover:bg-paper">
              <span className="grid size-11 place-items-center rounded-md bg-sage text-olive">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-display text-xl text-olive">{item.title}</span>
                <span className="mt-1 block text-ink">{item.copy}</span>
              </span>
            </Card>
          </Link>
        );
      })}
      <InstallCard />
    </div>
  );
}
