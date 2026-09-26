import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallCard() {
  const [event, setEvent] = useState<BIPEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BIPEvent);
    };
    const onInstalled = () => {
      setDone(true);
      setEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setDone(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (done) return null;

  async function install() {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setDone(true);
  }

  return (
    <section className="rounded-lg border border-yellow bg-cream p-5">
      <div className="mb-2 flex items-center gap-2 text-gold">
        <Smartphone className="size-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          Keep the system on your phone
        </p>
      </div>
      <h2 className="font-display text-xl text-olive text-balance">
        Install Deep Focus from Home
      </h2>
      <p className="mt-2 text-pretty text-ink">
        Add this app to your home screen. Your daily OS, starter week, and logs
        stay on this device — no account required.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {event ? (
          <Button onClick={() => void install()}>
            <Download className="size-4" />
            Install app
          </Button>
        ) : (
          <p className="text-sm text-muted">
            On iPhone: Share, then Add to Home Screen. On Android: the browser
            menu, then Install app.
          </p>
        )}
      </div>
    </section>
  );
}
