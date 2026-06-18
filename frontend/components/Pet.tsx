"use client";

import { type StaticImageData } from "next/image";
import { useState } from "react";

type Props = {
  src: StaticImageData | string;
  name: string;
  /** position inside the parent — uses Tailwind class string */
  className?: string;
  alt?: string;
};

export default function Pet({ src, name, className = "", alt }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`absolute ${className}`}
    >
      <img
        src={typeof src === "string" ? src : src.src}
        alt={alt ?? name}
        className="w-full h-auto [image-rendering:pixelated] cursor-pointer"
      />

      {/* Pixel tooltip — anchored above the pet, follows it */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap font-press text-[8px] px-2 py-1.5 bg-panel border-[3px] border-panel-stroke text-ink shadow-pixel-sm pointer-events-none transition-opacity duration-150 ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        {name}
        {/* little arrow at the bottom */}
        <span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-panel border-r-[3px] border-b-[3px] border-panel-stroke rotate-45 -mt-1" />
      </div>
    </div>
  );
}
