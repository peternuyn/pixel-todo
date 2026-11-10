"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { roomApi, type PresenceEvent } from "@/lib/api";
import { subscribeRoom } from "@/lib/ws";

const THEME_LABEL = ["Meadow", "Sunset", "Forest", "Night"];

/**
 * The strip above the study room: where am I, who else is here, and a way back.
 * Live count starts from the room snapshot and then follows presence events.
 */
export default function RoomHeader({ roomId }: { roomId: string | null }) {
  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => roomApi.get(roomId!),
    enabled: !!roomId,
  });

  const [live, setLive] = useState<number | null>(null);
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<PresenceEvent>(roomId, "presence", (e) => setLive(e.presentCount));
  }, [roomId]);
  const liveCount = live ?? room?.liveCount ?? 0;

  const [copied, setCopied] = useState(false);
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked (e.g. insecure context) — nothing useful to do */
    }
  }

  return (
    <div className="max-w-[1240px] mx-auto mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/rooms"
          className="tag inline-flex min-h-[44px] shrink-0 items-center !px-3"
          aria-label="Back to all rooms"
        >
          ← Rooms
        </Link>

        <div className="min-w-0">
          <h2 className="truncate font-jersey text-3xl leading-none text-ink sm:text-4xl">
            {room?.name ?? (roomId ? "Loading room…" : "Personal study")}
          </h2>
          {room && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-silk text-[9px] uppercase tracking-widest text-ink/80">
              <span>{THEME_LABEL[room.themeId - 1] ?? "Forest"}</span>
              <span aria-hidden>·</span>
              <span>{room.isPrivate ? "Private" : "Public"}</span>
              <span aria-hidden>·</span>
              <span className="normal-case tracking-normal font-pixelify text-sm">
                host <span className="font-bold text-ink">{room.hostName}</span>
              </span>
            </p>
          )}
        </div>
      </div>

      {room && (
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="flex min-h-[44px] items-center gap-2 border-[3px] border-panel-stroke bg-panel px-3 font-press text-[9px] text-ink"
            aria-live="polite"
          >
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${liveCount > 0 ? "bg-grass-deeper" : "bg-ink/30"}`}
            />
            {liveCount} / {room.capacity} here
          </span>
          <button
            type="button"
            onClick={copyInvite}
            className="tag min-h-[44px] !px-3"
            aria-label="Copy invite link to this room"
          >
            {copied ? "✓ Copied" : "Copy invite"}
          </button>
        </div>
      )}
    </div>
  );
}
