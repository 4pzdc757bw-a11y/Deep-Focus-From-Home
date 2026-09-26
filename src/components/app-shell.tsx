import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, House, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFocusStore } from "@/lib/store";
import { SessionWatcher } from "@/components/session-watcher";

const TABS = [
  { to: "/", label: "Today", icon: House },
  { to: "/starter", label: "Starter", icon: Sparkles },
  { to: "/guide", label: "Guide", icon: BookOpen },
  { to: "/more", label: "Tools", icon: CalendarCheck },
] as const;

const MARKETING = new Set(["/start", "/thanks", "/buy"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();

  useEffect(() => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      useFocusStore.getState().setHydrated(true);
    };
    const t = window.setTimeout(finish, 80);
    void Promise.resolve(useFocusStore.persist.rehydrate())
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(t);
        finish();
      });
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void router.preloadRoute({ to: "/intro" });
      void router.preloadRoute({ to: "/starter" });
      void router.preloadRoute({ to: "/guide" });
    }, 1500);
    return () => window.clearTimeout(t);
  }, [router]);

  const marketing = MARKETING.has(pathname);

  return (
    <div className="min-h-dvh bg-sage text-ink">
      <SessionWatcher />
      <header className="no-print sticky top-0 z-20 border-b border-yellow/80 bg-sage/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link to={marketing ? "/start" : "/"} className="flex min-w-0 items-center gap-3">
            <img
              src="/images/logo.jpg"
              alt=""
              className="size-8 rounded-sm object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-olive">
                Deep Focus
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-gold">
                From Home
              </p>
            </div>
          </Link>
          {marketing ? (
            <Link
              to="/"
              className="ml-auto text-xs font-semibold uppercase tracking-wide text-olive"
            >
              Open the app
            </Link>
          ) : (
            <span className="ml-auto hidden text-xs tracking-wide text-muted sm:inline">
              A system, not a test
            </span>
          )}
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-3xl px-4 pt-6",
          marketing ? "pb-16" : "pb-28",
        )}
      >
        {children}
      </main>

      {marketing ? null : (
        <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-yellow bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
          <ul className="mx-auto grid max-w-3xl grid-cols-4">
            {TABS.map((tab) => {
              const active =
                tab.to === "/"
                  ? pathname === "/"
                  : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
              const Icon = tab.icon;
              return (
                <li key={tab.to}>
                  <Link
                    to={tab.to}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide",
                      active ? "text-olive" : "text-muted",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function PageTitle({
  kicker,
  title,
  lede,
}: {
  kicker?: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="mb-6">
      {kicker ? (
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          {kicker}
        </p>
      ) : null}
      <h1 className="font-display text-3xl leading-tight text-olive text-balance">
        {title}
      </h1>
      {lede ? <p className="mt-2 max-w-prose text-pretty text-ink">{lede}</p> : null}
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-lg border border-yellow bg-cream p-4 sm:p-5", className)}
    >
      {children}
    </section>
  );
}
