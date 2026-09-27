let ctx: AudioContext | null = null;

async function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

function partial(
  ac: AudioContext,
  freq: number,
  when: number,
  dur: number,
  gain: number,
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

export async function playStartBell() {
  const ac = await audio();
  const t = ac.currentTime + 0.02;
  partial(ac, 784, t, 1.5, 0.12);
  partial(ac, 1175, t, 1.8, 0.07);
  partial(ac, 1568, t + 0.04, 1.2, 0.04);
}

export async function playDoneBell() {
  const ac = await audio();
  const t = ac.currentTime + 0.02;
  partial(ac, 659, t, 1.3, 0.12);
  partial(ac, 988, t, 1.6, 0.07);
  partial(ac, 523, t + 0.42, 1.6, 0.11);
  partial(ac, 784, t + 0.42, 1.8, 0.06);
}

export function parseClock(hhmm: string, from = new Date()) {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  return d;
}

export function remainingLabel(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/** Local wall-clock HH:MM for time inputs (24h). */
export function stampClockNow(from = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(from.getHours())}:${pad(from.getMinutes())}`;
}

/** Minutes between two HH:MM strings (same day). Null if either invalid. */
export function durationMinutes(start: string, end: string) {
  const a = parseClock(start);
  const b = parseClock(end);
  if (!a || !b) return null;
  let ms = b.getTime() - a.getTime();
  if (ms < 0) ms += 24 * 60 * 60 * 1000;
  return Math.round(ms / 60_000);
}

export function durationLabel(start: string, end: string) {
  const mins = durationMinutes(start, end);
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
