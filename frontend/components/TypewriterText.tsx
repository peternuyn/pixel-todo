"use client";

import { useEffect, useRef, useState } from "react";
import MessageContent from "./MessageContent";

// Reveals text like it's being typed. We show a few characters per tick so even a
// long answer finishes in a couple of seconds rather than feeling sluggish.
const CHARS_PER_TICK = 2;
const TICK_MS = 16;

// Types out an AI answer character-by-character. While revealing, we show plain text
// plus a blinking caret; once complete we hand off to MessageContent so any links or
// image URLs in the answer render just like a normal message.
//
// `animate` gates the effect: only messages that arrived LIVE this session type out.
// Messages loaded from history (or after a reload) pass animate={false} and render
// their full text instantly — so you never watch old answers re-type on every refresh.
export default function TypewriterText({
  text,
  animate,
  onProgress,
}: {
  text: string;
  animate: boolean;
  onProgress?: () => void;
}) {
  const [count, setCount] = useState(animate ? 0 : text.length);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => {
      setCount((c) => {
        const next = Math.min(c + CHARS_PER_TICK, text.length);
        if (next >= text.length) clearInterval(id);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
    // Runs once for this mounted message; text/animate are stable per messageId.
  }, [animate, text]);

  // Keep the chat pinned to the bottom as the answer grows.
  useEffect(() => {
    onProgressRef.current?.();
  }, [count]);

  if (count >= text.length) return <MessageContent content={text} />;

  return (
    <span className="whitespace-pre-wrap break-words">
      {text.slice(0, count)}
      <span className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[2px] animate-pulse bg-glow-deep align-middle" />
    </span>
  );
}
