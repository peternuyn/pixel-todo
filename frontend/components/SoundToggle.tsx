"use client";

import { useEffect, useState } from "react";
import { isSfxMuted, toggleSfxMuted, onSfxMutedChange, playSfx } from "@/lib/sfx";

/**
 * A small always-visible button to mute / unmute ALL sound effects. The choice is
 * remembered in localStorage (handled by lib/sfx), so it sticks across reloads.
 *
 * Mounted once in the root layout so it's on every page. We read the saved state
 * AFTER mount (localStorage doesn't exist during SSR) and gate rendering on `mounted`
 * to avoid a hydration mismatch.
 */
export default function SoundToggle() {
  const [muted, setMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMuted(isSfxMuted());
    setMounted(true);
    // Stay in sync if mute is changed elsewhere (e.g. another tab/component).
    return onSfxMutedChange(setMuted);
  }, []);

  if (!mounted) return null;

  return (
    <button
      type="button"
      data-sfx="off"
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      aria-pressed={muted}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        const nowMuted = toggleSfxMuted();
        // A little blip when turning sound back ON, as confirmation.
        if (!nowMuted) playSfx("select");
      }}
      className="fixed bottom-5 left-5 z-[80] w-11 h-11 bg-panel border-[3px] border-panel-stroke shadow-pixel-sm flex items-center justify-center text-lg active:translate-y-[2px] active:shadow-none"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
