import { playDoneBell, playStartBell } from "./chime";
import { useFocusStore } from "./store";

let completing = false;
let wake: WakeLockSentinel | null = null;

function notify(title: string, body: string) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    new Notification(title, { body, icon: "/favicon.svg" });
  } catch {
    /* ignore — permission or unsupported */
  }
}

export async function requestNotify() {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") await Notification.requestPermission();
  } catch {
    /* ignore */
  }
}

export async function holdScreen() {
  try {
    if (!("wakeLock" in navigator)) return;
    wake = await navigator.wakeLock.request("screen");
  } catch {
    wake = null;
  }
}

export function releaseScreen() {
  void wake?.release();
  wake = null;
}

export async function beginSession(args: {
  date: string;
  slotIndex: number;
  endsAt: number;
}) {
  completing = false;
  await playStartBell();
  await requestNotify();
  await holdScreen();
  const cur = useFocusStore.getState().dailies[args.date];
  useFocusStore.getState().setSession({
    running: true,
    slotIndex: args.slotIndex,
    endsAt: args.endsAt,
    phase: "live",
    date: args.date,
  });
  if (cur) {
    useFocusStore.getState().patchDaily(args.date, {
      checks: { ...cur.checks, block: true },
    });
  }
}

export async function completeSession() {
  const s = useFocusStore.getState().session;
  if (!s.running && s.phase !== "live") return;
  if (completing) return;
  completing = true;
  try {
    await playDoneBell();
    notify(
      "Block complete",
      "The deep-work slot is done. Write the outcome and shut down.",
    );
    releaseScreen();
    const date = s.date;
    const cur = date ? useFocusStore.getState().dailies[date] : undefined;
    useFocusStore.getState().setSession({ running: false, phase: "done" });
    if (cur && date) {
      useFocusStore.getState().patchDaily(date, {
        checks: { ...cur.checks, block: true },
      });
    }
  } finally {
    completing = false;
  }
}

export function catchUpSession() {
  const s = useFocusStore.getState().session;
  if (s.running && s.endsAt && Date.now() >= s.endsAt) {
    void completeSession();
  }
}
