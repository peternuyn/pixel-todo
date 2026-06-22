"use client";

import type { ReactNode } from "react";
import { useInView } from "@/lib/hooks/useInView";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

type Props = {
  children: ReactNode;
  /** Stagger, in ms, applied once the element scrolls into view. */
  delay?: number;
  className?: string;
};

// Wrapper that fades + lifts its children into place the first time they scroll
// into view (see {@link useInView}). Composes cleanly around anything — a heading,
// a card, a button row. Reduced-motion users get the content shown instantly with
// no transition.
export default function Reveal({ children, delay = 0, className = "" }: Props) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const shown = reduced || inView;

  return (
    <div
      ref={ref}
      className={`${className} ${
        reduced ? "" : "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:will-change-[opacity,transform]"
      } ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: shown && !reduced ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
