"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredUser } from "@/lib/api";
import { subscribeUser } from "@/lib/ws";
import { playSfx } from "@/lib/sfx";
import type { Badge } from "@/lib/user";

/**
 * Listens for "you just earned a badge" events pushed from the backend over
 * WebSocket (/topic/users/{userId}/badges) and pops a celebratory toast — with a
 * pop-in animation, a sparkle burst, and the unlock sound effect — the instant one
 * arrives. No page reload needed.
 *
 * Mounted once in the root layout (inside Providers) so it works on every page. It's
 * invisible until a badge comes in.
 */

// Where the sparkles fly to, relative to where they start. Hand-placed around the
// toast so the burst looks lively rather than uniform.
const SPARKLES = [
  { left: "6%", top: "16%", dx: "-16px", dy: "-18px", delay: "0s" },
  { left: "92%", top: "22%", dx: "18px", dy: "-14px", delay: "0.08s" },
  { left: "18%", top: "84%", dx: "-14px", dy: "16px", delay: "0.04s" },
  { left: "84%", top: "80%", dx: "16px", dy: "16px", delay: "0.12s" },
  { left: "50%", top: "2%", dx: "0px", dy: "-22px", delay: "0.06s" },
];

export default function BadgeToaster() {
  const queryClient = useQueryClient();
  // Each toast is a badge plus a unique id so we can dismiss it individually.
  const [toasts, setToasts] = useState<{ id: number; badge: Badge }[]>([]);

  useEffect(() => {
    // Read the user after mount (localStorage isn't available during SSR).
    const user = getStoredUser();
    if (!user) return;

    const unsubscribe = subscribeUser<Badge>(user.userId, "badges", (badge) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, badge }]);
      playSfx("badge");

      // Refresh the profile's badge list so the new badge shows up there too.
      queryClient.invalidateQueries({ queryKey: ["badges", user.userId] });

      // Auto-dismiss after a few seconds.
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });

    return unsubscribe;
  }, [queryClient]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map(({ id, badge }) => (
        <button
          key={id}
          type="button"
          onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
          className="animate-badge-pop relative flex items-center gap-3 overflow-visible bg-panel border-[3px] border-panel-stroke shadow-pixel-lg px-4 py-3 text-left"
        >
          {/* Sparkle burst */}
          <span className="pointer-events-none absolute inset-0 overflow-visible">
            {SPARKLES.map((s, i) => (
              <span
                key={i}
                className="animate-sparkle absolute text-sm"
                style={
                  {
                    left: s.left,
                    top: s.top,
                    animationDelay: s.delay,
                    "--dx": s.dx,
                    "--dy": s.dy,
                  } as CSSProperties
                }
              >
                ✨
              </span>
            ))}
          </span>

          <span className="text-3xl">{badge.emoji}</span>
          <div className="flex flex-col">
            <span className="font-press text-[8px] text-grass-dark tracking-widest">
              BADGE UNLOCKED
            </span>
            <span className="font-jersey text-2xl text-ink leading-none mt-0.5">
              {badge.label}
            </span>
            <span className="font-pixelify text-xs text-ink/60 leading-tight">
              {badge.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
