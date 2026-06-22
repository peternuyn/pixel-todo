"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { badgeApi, getStoredUser } from "@/lib/api";
import { subscribeUser } from "@/lib/ws";
import { playSfx } from "@/lib/sfx";
import type { Badge } from "@/lib/user";

/**
 * Pops a celebratory toast the moment a user earns a new badge — anywhere in the
 * app. Mounted once in the root layout (inside Providers) so it works on every
 * page. It's invisible until a badge comes in.
 *
 * WHY TWO DELIVERY PATHS (and not just the WebSocket)?
 *   1. INSTANT (WebSocket): the backend pushes "/topic/users/{id}/badges" the
 *      instant a badge is awarded. That's snappy, BUT Spring's in-memory broker
 *      does NOT queue messages for a client that isn't subscribed at that exact
 *      moment. If the socket is still connecting, mid-reconnect, or we navigate
 *      away the instant it fires, that one frame is lost forever — and the toast
 *      never shows. This was the "no pop-up when I create a room" bug.
 *   2. RELIABLE (server truth + diff): we also keep a live query of the user's
 *      FULL badge list. Whenever it refetches (on focus, on a poll, or because a
 *      badge-earning action invalidated it), we compare the earned set to what we
 *      showed before and toast anything new. Even if the WebSocket frame was
 *      missed, the badge still surfaces here within seconds.
 *
 * A shared `shownRef` set guarantees each badge toasts EXACTLY ONCE no matter
 * which path discovers it first.
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

// How long a toast stays on screen before auto-dismissing (ms).
const TOAST_TTL = 6500;

export default function BadgeToaster() {
  const queryClient = useQueryClient();
  // Each toast is a badge plus a unique id so we can dismiss it individually.
  const [toasts, setToasts] = useState<{ id: number; badge: Badge }[]>([]);

  // Read the logged-in user once (localStorage isn't available during SSR, so we
  // only have it after mount; the query below is gated on it).
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    setUserId(getStoredUser()?.userId ?? null);
  }, []);

  // The set of badge keys we've already toasted, so neither delivery path can
  // double-pop the same badge. A ref (not state) because changing it must NOT
  // trigger a re-render — it's bookkeeping, not UI.
  const shownRef = useRef<Set<string>>(new Set());
  // Have we taken the first "snapshot" of already-earned badges yet? On the very
  // first load we seed `shownRef` WITHOUT toasting, otherwise we'd spam a toast
  // for every badge the user already had.
  const seededRef = useRef(false);

  // The single, shared "show a toast for this badge" routine. Both the WebSocket
  // handler and the query-diff effect funnel through here, and the `shownRef`
  // guard makes it idempotent per badge.
  function celebrate(badge: Badge) {
    if (shownRef.current.has(badge.key)) return; // already shown — ignore
    shownRef.current.add(badge.key);

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, badge }]);
    playSfx("badge");

    // Auto-dismiss after a few seconds.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL);
  }

  // ---- Reliable path: the user's full badge list, kept fresh -----------------
  // forUser() re-evaluates badges server-side, so this both reads the truth AND
  // self-heals (it can grant a threshold badge the user already qualified for).
  // refetchOnWindowFocus + a gentle poll mean a missed WebSocket frame still
  // surfaces within seconds without any action from the user.
  const { data: badges } = useQuery({
    queryKey: ["badges", userId],
    queryFn: () => badgeApi.forUser(userId!),
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!badges) return;
    const earned = badges.filter((b) => b.earnedAt);

    // First successful load for this user: remember what they already had so we
    // don't toast historical badges, then bail.
    if (!seededRef.current) {
      earned.forEach((b) => shownRef.current.add(b.key));
      seededRef.current = true;
      return;
    }

    // Any newly earned badge that we haven't shown yet gets a toast (celebrate()
    // dedupes, so a badge already popped by the WebSocket path is skipped here).
    earned.forEach(celebrate);
    // celebrate/shownRef are stable refs; we only care about `badges` changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges]);

  // ---- Instant path: live WebSocket push -------------------------------------
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeUser<Badge>(userId, "badges", (badge) => {
      // Pop immediately for that snappy feel...
      celebrate(badge);
      // ...and refetch the authoritative list so the profile page (and our diff
      // bookkeeping) stay in sync.
      queryClient.invalidateQueries({ queryKey: ["badges", userId] });
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[120] flex flex-col items-end gap-3 px-4">
      {toasts.map(({ id, badge }) => (
        <button
          key={id}
          type="button"
          onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
          className="animate-badge-pop relative flex items-center gap-4 overflow-visible bg-panel border-[4px] border-panel-stroke shadow-pixel-lg px-6 py-4 text-left max-w-[92vw]"
        >
          {/* Sparkle burst */}
          <span className="pointer-events-none absolute inset-0 overflow-visible">
            {SPARKLES.map((s, i) => (
              <span
                key={i}
                className="animate-sparkle absolute text-base"
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

          <span className="text-5xl">{badge.emoji}</span>
          <div className="flex flex-col">
            <span className="font-press text-[9px] text-grass-dark tracking-widest">
              🏆 ACHIEVEMENT UNLOCKED
            </span>
            <span className="font-jersey text-3xl text-ink leading-none mt-1">
              {badge.label}
            </span>
            <span className="font-pixelify text-sm text-ink/60 leading-tight mt-0.5">
              {badge.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
