"use client";

import { useEffect, useState } from "react";
import { getStoredUser, roomTimerApi, RoomTimerResponse } from "@/lib/api";
import { subscribeRoom } from "@/lib/ws";
import { remainingNow } from "@/lib/timer";
import TimerView from "./TimerView";

// The SHARED room clock. It's "owned" by the room: the backend holds the real
// state, and every member sees the same countdown.
//
// HOW IT STAYS IN SYNC: on mount we GET the current state, then SUBSCRIBE to
// /topic/rooms/{roomId}/timer over WebSocket. Whenever anyone starts/pauses/resets,
// the backend pushes the new state to that channel and every client updates. We do
// NOT receive a tick each second — we get the snapshot (including `endsAt`) and run
// our own local interval to animate the number between updates.
export default function RoomTimer({ roomId }: { roomId: string | null }) {
  const [snap, setSnap] = useState<RoomTimerResponse | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = getStoredUser()?.userId ?? null;

  // Initial fetch + live subscription. Re-runs if the room changes.
  useEffect(() => {
    if (!roomId) return;
    let active = true;

    roomTimerApi
      .get(roomId)
      .then((s) => {
        if (active) setSnap(s);
      })
      .catch(() => {
        /* leave snap null; the panel just shows a default */
      });

    const unsubscribe = subscribeRoom<RoomTimerResponse>(roomId, "timer", (s) => {
      if (active) setSnap(s);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [roomId]);

  // Animate the displayed number locally from the latest snapshot.
  useEffect(() => {
    if (!snap) return;
    setDisplaySeconds(remainingNow(snap));
    if (snap.state !== "RUNNING") return; // only a running clock needs ticking
    const id = setInterval(() => {
      const left = remainingNow(snap);
      setDisplaySeconds(left);
      // Hit zero locally — stop ticking and wait for the server's completion
      // push (the authoritative state) rather than spinning at 00:00.
      if (left <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [snap]);

  if (!roomId) {
    return (
      <p className="font-pixelify text-sm text-ink/50 text-center py-6">
        Join a room to use its shared timer.
      </p>
    );
  }

  // Wrap a control call: show errors (e.g. 403 "join the room first") and a busy
  // state. We also set the returned snapshot immediately so the clicker's own UI
  // updates without waiting for the broadcast to come back around.
  async function run(action: () => Promise<RoomTimerResponse>) {
    if (!userId) {
      setError("Log in to control the room timer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSnap(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const state = snap?.state ?? "IDLE";
  const running = state === "RUNNING";

  return (
    <TimerView
      displaySeconds={displaySeconds}
      running={running}
      label={running ? "Studying together" : "Shared room clock"}
      presetsDisabled={running}
      busy={busy}
      error={error}
      onToggle={() =>
        run(() =>
          running
            ? roomTimerApi.pause(roomId, userId!)
            : roomTimerApi.start(roomId, userId!)
        )
      }
      onReset={() => run(() => roomTimerApi.reset(roomId, userId!))}
      onSetMinutes={(minutes) =>
        run(() => roomTimerApi.setDuration(roomId, userId!, Math.round(minutes * 60)))
      }
    />
  );
}
