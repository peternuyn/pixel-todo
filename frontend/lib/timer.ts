// Shared timer maths used by BOTH the room clock (server-driven) and the personal
// clock (browser-only). Keeping it here means the two timers count down and format
// identically.

// The minimal state a countdown needs. It matches the RUNNING/IDLE/PAUSED model on
// the backend: while RUNNING, `endsAt` (an ISO timestamp) is the source of truth and
// we subtract `now` from it; otherwise `remainingSeconds` is the frozen value.
export type TimerSnapshot = {
  state: "IDLE" | "RUNNING" | "PAUSED";
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: string | null;
};

// The quick-pick durations, in minutes.
export const PRESET_MINUTES = [15, 25, 35];

// How many whole seconds are left right now. While RUNNING we compute it from
// endsAt so every client (and tab) agrees without anyone streaming ticks; clamped
// at 0 so a finished clock never shows a negative time.
export function remainingNow(snap: TimerSnapshot): number {
  if (snap.state === "RUNNING" && snap.endsAt) {
    const left = Math.round((new Date(snap.endsAt).getTime() - Date.now()) / 1000);
    return left > 0 ? left : 0;
  }
  return snap.remainingSeconds;
}

// Seconds -> "MM:SS".
export function formatMMSS(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
