import { useEffect, useState } from "react";
import { catchUpSession, completeSession, holdScreen } from "@/lib/session-runtime";
import { useFocusStore } from "@/lib/store";

export function SessionWatcher() {
  const running = useFocusStore((s) => s.session.running);
  const endsAt = useFocusStore((s) => s.session.endsAt);
  const hydrated = useFocusStore((s) => s.hydrated);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    catchUpSession();
  }, [hydrated]);

  useEffect(() => {
    if (!running || !endsAt) return;
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
      if (Date.now() >= endsAt) void completeSession();
    }, 500);
    return () => window.clearInterval(id);
  }, [running, endsAt]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      catchUpSession();
      if (useFocusStore.getState().session.running) void holdScreen();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  return null;
}
