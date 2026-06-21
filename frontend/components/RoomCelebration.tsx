"use client";

import { useEffect, useState } from "react";
import { subscribeRoom } from "@/lib/ws";

/**
 * Shows a celebratory banner to EVERYONE in a room when one of its studiers earns a
 * badge — "🎉 benten earned Pomodoro Pal!". Listens on /topic/rooms/{roomId}/badges,
 * which the backend's RoomBadgeAnnouncer broadcasts to. Studying together + public
 * wins is what makes a study room feel alive.
 */

// Mirrors the backend RoomBadgeCelebration record.
type RoomBadge = {
  displayName: string;
  emoji: string;
  label: string;
  badgeKey: string;
};

export default function RoomCelebration({ roomId }: { roomId: string | null }) {
  const [banners, setBanners] = useState<{ id: number; badge: RoomBadge }[]>([]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<RoomBadge>(roomId, "badges", (badge) => {
      const id = Date.now() + Math.random();
      setBanners((prev) => [...prev, { id, badge }]);
      setTimeout(() => {
        setBanners((prev) => prev.filter((x) => x.id !== id));
      }, 5000);
    });
  }, [roomId]);

  if (banners.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2">
      {banners.map(({ id, badge }) => (
        <div
          key={id}
          className="animate-banner flex items-center gap-2 bg-sun border-[3px] border-panel-stroke shadow-pixel-lg px-4 py-2"
        >
          <span className="text-2xl">{badge.emoji}</span>
          <span className="font-pixelify text-base text-ink">
            🎉 <span className="font-bold">{badge.displayName}</span> earned{" "}
            <span className="font-bold">{badge.label}</span>!
          </span>
        </div>
      ))}
    </div>
  );
}
