"use client";

import { useEffect, useState } from "react";

type Props = {
  initialSeconds?: number;
  autoStart?: boolean;
  label?: string;
};

export default function Timer({
  initialSeconds = 25 * 60,
  autoStart = true,
  label = "Focus session",
}: Props) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(autoStart);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  function reset() {
    setRunning(false);
    setSeconds(initialSeconds);
  }

  return (
    <section
      className="relative w-full p-5 pb-6 rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel flex flex-col items-center justify-center text-center"
    >
      <div className="font-press text-[11px] flex items-center gap-2.5 mb-3">
        <span>⏰</span>
        <span>Timer</span>
      </div>
      <div className="font-vt text-[56px] leading-none tracking-wider text-ink [text-shadow:3px_3px_0_#FFD66B]">
        {mm}:{ss}
      </div>
      <p className="font-silk text-[11px] uppercase tracking-widest text-wood-dark mt-1.5">
        {label}
      </p>
      <div className="flex gap-2 mt-3">
        <button className="tag" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : "Start"}
        </button>
        <button className="tag" onClick={reset}>
          Reset
        </button>
      </div>
    </section>
  );
}
