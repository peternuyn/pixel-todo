"use client";

import { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: StaticImageData | string;
  name?: string;
  top: string;
  width: string;
  speed?: number;
  /** left boundary % of container, default 0 */
  minX?: number;
  /** right boundary % of container, default 100 */
  maxX?: number;
};

export default function WalkingPet({ src, name, top, width, speed = 6, minX = 0, maxX = 100 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(minX);          
  const dirRef = useRef<1 | -1>(1);     // 1 = going right, -1 = left
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const [pos, setPos] = useState(minX);
  const [facingRight, setFacingRight] = useState(true);

  useEffect(() => {
    const step = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const containerW = containerRef.current?.offsetWidth ?? 1;
      const selfW = (parseFloat(width) / 100) * containerW;
      const selfPct = (selfW / containerW) * 100;

      const next = posRef.current + dirRef.current * speed * dt;

      const maxPos = maxX - selfPct;
      if (next >= maxPos) {
        posRef.current = maxPos;
        dirRef.current = -1;
        setFacingRight(false);
      } else if (next <= minX) {
        posRef.current = minX;
        dirRef.current = 1;
        setFacingRight(true);
      } else {
        posRef.current = next;
      }

      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [speed, width, minX, maxX]);

  const [hover, setHover] = useState(false);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <div
        className="absolute pointer-events-auto"
        style={{ top, left: `${pos}%`, width }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <img
          src={typeof src === "string" ? src : src.src}
          alt={name ?? ""}
          className={`w-full h-auto [image-rendering:pixelated] cursor-pointer ${facingRight ? "" : "-scale-x-100"}`}
        />
        {name && (
          <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap font-press text-[8px] px-2 py-1.5 bg-panel border-[3px] border-panel-stroke text-ink shadow-pixel-sm pointer-events-none transition-opacity duration-150 ${hover ? "opacity-100" : "opacity-0"}`}>
            {name}
            <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-panel border-r-[3px] border-b-[3px] border-panel-stroke rotate-45 -mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}
