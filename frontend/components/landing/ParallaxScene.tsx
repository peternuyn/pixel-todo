"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// Provider half of a lightweight parallax system. It tracks the pointer, smooths
// it with a critically-damped lerp inside a single rAF loop, and writes the result
// to two CSS custom properties (`--parallax-x` / `--parallax-y`, each in [-1, 1])
// on its root element.
//
// WHY CSS VARIABLES instead of React state? The values change every frame; pushing
// them through state would re-render the whole subtree 60×/sec. Writing a CSS var
// stays on the compositor — children read it in pure CSS (see <ParallaxLayer>), so
// React never re-renders after mount. Honours reduced-motion by staying inert.
export default function ParallaxScene({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      el.style.setProperty("--parallax-x", current.x.toFixed(4));
      el.style.setProperty("--parallax-y", current.y.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
