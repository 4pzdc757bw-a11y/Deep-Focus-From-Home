import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    defaultPendingMs: 0,
    defaultStaleTime: 30_000,
    defaultNotFoundComponent: () => (
      <main className="py-16 text-center">
        <h1 className="font-display text-2xl text-olive">That page is not in the system</h1>
        <p className="mt-2 text-muted">Try Today, Starter, or the Guide.</p>
      </main>
    ),
  });
}
