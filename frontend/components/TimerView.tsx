"use client";

import { useState } from "react";
import { PRESET_MINUTES, formatMMSS } from "@/lib/timer";

// A purely PRESENTATIONAL clock: it shows the time and the controls, and calls
// back when the user clicks. It holds no timer logic itself — the room clock
// (server-driven) and the personal clock (browser-only) both render this and wire
// the callbacks to their own behaviour. Same idea as TodoRow being shared by the
// room and personal to-do lists.
type Props = {
  displaySeconds: number;
  running: boolean;            // RUNNING? -> show "Pause"; otherwise "Start"
  label: string;
  presetsDisabled?: boolean;   // length can't change while the clock runs
  busy?: boolean;              // a request is in flight (room clock only)
  error?: string | null;
  onToggle: () => void;        // start if stopped, pause if running
  onReset: () => void;
  onSetMinutes: (minutes: number) => void;
};

export default function TimerView({
  displaySeconds,
  running,
  label,
  presetsDisabled = false,
  busy = false,
  error = null,
  onToggle,
  onReset,
  onSetMinutes,
}: Props) {
  const [custom, setCustom] = useState("");

  function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    const minutes = Number(custom);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    onSetMinutes(minutes);
    setCustom("");
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="font-vt text-[56px] leading-none tracking-wider text-ink [text-shadow:3px_3px_0_#FFD66B]">
        {formatMMSS(displaySeconds)}
      </div>
      <p className="font-silk text-[11px] uppercase tracking-widest text-wood-dark mt-1.5">
        {label}
      </p>

      <div className="flex gap-2 mt-3">
        <button className="tag" onClick={onToggle} disabled={busy}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="tag" onClick={onReset} disabled={busy}>
          Reset
        </button>
      </div>

      {/* Preset lengths + a custom minutes box. Disabled while the clock runs,
          mirroring the backend rule that you stop before changing the length. */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-3">
        {PRESET_MINUTES.map((m) => (
          <button
            key={m}
            className="tag"
            onClick={() => onSetMinutes(m)}
            disabled={presetsDisabled || busy}
          >
            {m}m
          </button>
        ))}
        <form onSubmit={submitCustom} className="flex gap-1.5">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="min"
            inputMode="numeric"
            disabled={presetsDisabled || busy}
            className="w-14 font-pixelify text-base bg-white border-[3px] border-panel-stroke px-2 py-1.5 outline-none text-ink focus:bg-[#F4FBF5] disabled:opacity-50"
          />
          <button type="submit" className="tag" disabled={presetsDisabled || busy}>
            Set
          </button>
        </form>
      </div>

      {error && (
        <p className="font-pixelify text-xs text-barn mt-2">{error}</p>
      )}
    </div>
  );
}
