import { playDoneBell, playStartBell, stampClockNow } from "./chime";
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

/**
 * Start a block. State flips to running immediately (one tap), then the bell,
 * wake lock, and notification permission run in the background — they must
 * never hold the UI (Chrome's notification prompt used to leave the button on
 * "Start" until it was answered, which felt like a second tap was needed).
 */
export async function beginSession(args: {
  date: string;
  slotIndex: number;
  endsAt: number;
}) {
  completing = false;
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
  // Called synchronously inside the tap so audio is allowed to start.
  const bell = playStartBell().catch(() => undefined);
  void holdScreen();
  void requestNotify();
  await bell;
}

export async function completeSession() {
  const s = useFocusStore.getState().session;
  if (!s.running && s.phase !== "live") return;
  if (completing) return;
  completing = true;
  try {
    const date = s.date;
    const cur = date ? useFocusStore.getState().dailies[date] : undefined;
    useFocusStore.getState().setSession({ running: false, phase: "done" });
    if (cur && date) {
      const stampedEnd = stampClockNow();
      const slots = [...cur.slots] as typeof cur.slots;
      const idx = s.slotIndex;
      if (slots[idx]) {
        slots[idx] = { ...slots[idx], end: stampedEnd };
      }
      useFocusStore.getState().patchDaily(date, {
        slots,
        checks: { ...cur.checks, block: true },
      });
    }
    releaseScreen();
    notify(
      "Block complete",
      "The deep-work slot is done. Write the outcome and shut down.",
    );
    await playDoneBell().catch(() => undefined);
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
