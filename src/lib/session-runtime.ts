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

/**
 * True when the browser has not been asked yet (permission "default"), so the
 * Daily OS should show its one-line explainer before asking. Granted, denied
 * or unsupported → never show it again.
 */
export function shouldExplainNotify() {
  try {
    return typeof Notification !== "undefined" && Notification.permission === "default";
  } catch {
    return false;
  }
}

/** Ask the browser. Only call after the user taps OK on the in-app explainer. */
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
 * Start a block. State flips to running immediately (one tap), then the bell
 * and wake lock run in the background — they must never hold the UI.
 * Notification permission is NOT requested here: the Daily OS first shows a
 * short in-app explainer and only asks the browser after the user taps OK.
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
      const idx = s.slotIndex;
      // patchSlot keeps the day's full set of blocks (a saved day may be an
      // older 1–3 block save that the store brings up to date on write).
      if (cur.slots[idx]) useFocusStore.getState().patchSlot(date, idx, { end: stampedEnd });
      useFocusStore.getState().patchDaily(date, {
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
