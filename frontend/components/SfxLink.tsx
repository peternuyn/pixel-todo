"use client";

import Link from "next/link";
import { playSfx, type Sfx } from "@/lib/sfx";
import type { ComponentProps } from "react";

// A Next.js <Link> that plays a UI sound when clicked. The global ButtonSfx helper
// only covers <button>s; this lets navigation links (which render as <a>) make a
// sound too, and lets a server component pass the sound choice without becoming a
// client component itself.
export default function SfxLink({
  sfx = "select",
  onClick,
  ...props
}: ComponentProps<typeof Link> & { sfx?: Sfx }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        playSfx(sfx);
        onClick?.(e);
      }}
    />
  );
}
