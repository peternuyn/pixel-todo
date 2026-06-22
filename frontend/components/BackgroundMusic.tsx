"use client";

import { useEffect } from "react";
import { isSfxMuted, onSfxMutedChange } from "@/lib/sfx";

// Loops a background music track for as long as this component is mounted (so it
// plays only on the page that renders it). It obeys the same global mute as the
// sound effects, and works around the browser autoplay policy: if play() is
// blocked because the user hasn't interacted with the page yet, we start the
// track on their first click/keypress.
export default function BackgroundMusic({
  src,
  volume = 0.2,
}: {
  src: string;
  volume?: number;
}) {
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;

    // Start playing unless muted. Safe to call repeatedly — play() on an already
    // playing element is a no-op, and a blocked play() just rejects (swallowed).
    const start = () => {
      if (isSfxMuted()) return;
      void audio.play().catch(() => {});
    };

    start();

    // If autoplay was blocked above, the first user gesture unblocks it.
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });

    // React to the global mute toggle (the SoundToggle button).
    const offMute = onSfxMutedChange((muted) => {
      if (muted) audio.pause();
      else void audio.play().catch(() => {});
    });

    return () => {
      offMute();
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      audio.pause();
      audio.src = "";
    };
  }, [src, volume]);

  return null;
}
