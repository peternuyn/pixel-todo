"use client";

import { useEffect, useState } from "react";
import { getStoredUser } from "@/lib/api";
import { remainingNow, TimerSnapshot } from "@/lib/timer";
import TimerView from "./TimerView";

// Where we keep the personal clock in the browser, scoped to the logged-in user
// (so two people sharing a browser get separate clocks). It is NOT tied to a room,
// so it follows the user between rooms — exactly like the personal to-do list.
function storageKey(): string {
  return `personal-timer:${getStoredUser()?.userId ?? "guest"}`;
}

const DEFAULT_SNAP: TimerSnapshot = {
  state: "IDLE",
  durationSeconds: 1500, // 25 min
  remainingSeconds: 1500,
  endsAt: null,
};

// The PERSONAL clock. It never touches the backend and earns no shared study time
// — it lives entirely in localStorage. The same timestamp trick used by the room
// clock (store `endsAt` while running) means it keeps the right time even across a
// page reload.
export default function PersonalTimer() {
  const [snap, setSnap] = useState<TimerSnapshot>(DEFAULT_SNAP);
  const [displaySeconds, setDisplaySeconds] = useState(DEFAULT_SNAP.remainingSeconds);
  // localStorage isn't available during server render; load after mount and gate on
  // `mounted` to avoid a hydration mismatch (same pattern as PersonalTodo).
  const [mounted, setMounted] = useState(false);

  // Load the saved clock once, on mount.
  useEffect(() => {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      try {
        setSnap(JSON.parse(raw) as TimerSnapshot);
      } catch {
        // Corrupted/old data — start from the default.
      }
    }
    setMounted(true);
  }, []);

  // Persist whenever the clock changes (after the initial load).
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(storageKey(), JSON.stringify(snap));
    }
  }, [snap, mounted]);

  // Animate the display, and auto-stop when a running clock reaches zero.
  useEffect(() => {
    setDisplaySeconds(remainingNow(snap));
    if (snap.state !== "RUNNING") return;
    const id = setInterval(() => {
      const left = remainingNow(snap);
      setDisplaySeconds(left);
      if (left <= 0) {
        // Finished: fall back to a fresh, stopped, full-length clock.
        setSnap((s) => ({
          ...s,
          state: "IDLE",
          remainingSeconds: s.durationSeconds,
          endsAt: null,
        }));
      }
    }, 250);
    return () => clearInterval(id);
  }, [snap]);

  const running = snap.state === "RUNNING";

  function toggle() {
    setSnap((s) => {
      if (s.state === "RUNNING") {
        // Pause: freeze the live remaining value.
        return { ...s, state: "PAUSED", remainingSeconds: remainingNow(s), endsAt: null };
      }
      // Start/resume: rebuild endsAt from whatever is left (full length if at 0).
      const remaining = s.remainingSeconds > 0 ? s.remainingSeconds : s.durationSeconds;
      return {
        ...s,
        state: "RUNNING",
        remainingSeconds: remaining,
        endsAt: new Date(Date.now() + remaining * 1000).toISOString(),
      };
    });
  }

  function reset() {
    setSnap((s) => ({
      ...s,
      state: "IDLE",
      remainingSeconds: s.durationSeconds,
      endsAt: null,
    }));
  }

  function setMinutes(minutes: number) {
    const seconds = Math.round(minutes * 60);
    setSnap({
      state: "IDLE",
      durationSeconds: seconds,
      remainingSeconds: seconds,
      endsAt: null,
    });
  }

  if (!mounted) {
    return <p className="font-pixelify text-sm text-ink/50 text-center py-6">Loading…</p>;
  }

  return (
    <TimerView
      displaySeconds={displaySeconds}
      running={running}
      label="My focus session"
      presetsDisabled={running}
      onToggle={toggle}
      onReset={reset}
      onSetMinutes={setMinutes}
    />
  );
}
