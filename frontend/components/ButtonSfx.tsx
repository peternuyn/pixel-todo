"use client";

import { useEffect } from "react";
import { playSfx, type Sfx } from "@/lib/sfx";

// Plays a click sound for EVERY <button> in the app from one place, instead of
// wiring an onClick sound into all ~50 buttons by hand. Mounted once in the root
// layout, it listens for clicks on `document` and plays the "select" blip
// whenever the click lands on (or inside) a button.
//
// Per-button overrides via a `data-sfx` attribute:
//   data-sfx="off"                     -> stay silent (the button plays its own
//                                         sound, e.g. confirm/cancel, in its handler)
//   data-sfx="confirm" | "cancel" | …  -> play that sound instead of "select"
//
// We listen in the CAPTURE phase so the blip still fires for buttons whose
// handlers call stopPropagation (e.g. the to-do delete ✕), and so it plays
// before the button's own onClick runs. playSfx already no-ops when muted/SSR.
const VALID: readonly Sfx[] = ["select", "confirm", "cancel", "badge"];

export default function ButtonSfx() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest("button");
      if (!btn || btn.disabled) return;
      const kind = btn.dataset.sfx;
      if (kind === "off") return;
      playSfx(VALID.includes(kind as Sfx) ? (kind as Sfx) : "select");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
