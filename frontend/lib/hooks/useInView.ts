"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** How much of the element must be visible to count (0–1). */
  threshold?: number;
  /** Margin around the root; the negative bottom delays reveal until scrolled in. */
  rootMargin?: string;
  /** Reveal once and stop observing (default), or toggle as it enters/leaves. */
  once?: boolean;
};

// Reveal-on-scroll primitive built on IntersectionObserver. Returns a ref to
// attach to the target and whether it is currently in view. Degrades gracefully
// to "always visible" when IntersectionObserver is unavailable (old browsers).
export function useInView<T extends Element = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}
