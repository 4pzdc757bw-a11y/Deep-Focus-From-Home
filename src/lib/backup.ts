import { readStarterWriteIns, useFocusStore } from "./store";

const KEYS = [
  "starterStart",
  "starterDone",
  "starterNotes",
  "starterWriteIns",
  "dailies",
  "energy",
  "setup",
  "homeFocusWeekTwoPrompted",
  "blockSetupDone",
  "household",
  "weeks",
  "months",
] as const;

export function exportPayload() {
  const state = useFocusStore.getState();
  const data: Record<string, unknown> = {
    app: "deep-focus-from-home",
    exportedAt: new Date().toISOString(),
  };
  for (const key of KEYS) data[key] = state[key];
  return data;
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `deep-focus-from-home-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("Not a Deep Focus file.");
  const data = raw as Record<string, unknown>;
  if (data.app && data.app !== "deep-focus-from-home") {
    throw new Error("Not a Deep Focus file.");
  }
  const patch: Record<string, unknown> = {};
  for (const key of KEYS) {
    if (key in data) patch[key] = data[key];
  }
  // Starter write-ins: keep only well-formed text (older backups simply don't have them).
  if ("starterWriteIns" in patch) patch.starterWriteIns = readStarterWriteIns(patch.starterWriteIns);
  useFocusStore.setState(patch);
}

export function partnerMessage(args: {
  date: string;
  partnerNote: string;
  slots: { start: string; end: string; task: string; outcome: string }[];
}) {
  const lines = [
    `Deep Focus from Home — ${args.date}`,
    args.partnerNote.trim() || "Today I will finish:",
  ];
  for (const slot of args.slots) {
    if (!slot.task && !slot.outcome) continue;
    const time = [slot.start, slot.end].filter(Boolean).join("–");
    const bit = [time, slot.task, slot.outcome].filter(Boolean).join(" · ");
    if (bit) lines.push(`• ${bit}`);
  }
  return lines.join("\n");
}
