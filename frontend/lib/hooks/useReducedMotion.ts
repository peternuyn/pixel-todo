"use client";

import { useEffect, useState } from "react";

// Tracks the OS-level "prefers-reduced-motion" setting and keeps it live (it can
// change at runtime). Animation/parallax components read this and fall back to a
// static layout so motion-sensitive users get a calm page. SSR-safe: defaults to
// `false` and only reads `matchMedia` after mount.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reduced;
}
