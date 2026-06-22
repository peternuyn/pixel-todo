"use client";

import Image from "next/image";
import type { Room } from "@/lib/rooms";
import { playSfx } from "@/lib/sfx";
import theme1 from "@/assets/theme-room1.svg";
import theme2 from "@/assets/theme-room2.svg";
import theme3 from "@/assets/theme-room3.svg";
import theme4 from "@/assets/theme-room4.svg";

type Props = {
  room: Room;
  onJoin: (room: Room) => void;
};

// The card banner mirrors the room's actual environment. Themes are 1-indexed
// (1=Meadow, 2=Sunset, 3=Forest, 4=Night) to match FarmScene and the DB, so we
// look up by themeId - 1. The fallback keeps us safe if an unexpected id arrives.
const BANNERS = [
  { src: theme1, label: "Meadow" },
  { src: theme2, label: "Sunset" },
  { src: theme3, label: "Forest" },
  { src: theme4, label: "Night" },
];

function bannerFor(themeId: number) {
  return BANNERS[themeId - 1] ?? BANNERS[2];
}

export default function RoomCard({ room, onJoin }: Props) {
  const fillPct = Math.min(100, Math.round((room.occupants / room.capacity) * 100));
  const isFull = room.occupants >= room.capacity;
  const banner = bannerFor(room.themeId);

  // A short row of paw avatars next to the all-time join count.
  const dots = Math.min(Math.max(room.joined, 1), 5);

  return (
    <div className="panel feature-card group flex flex-col gap-0 overflow-hidden rounded-3xl !p-0 !pb-0">
      {/* Banner header — themed scene with the room name overlaid */}
      <div className="relative h-28 w-full overflow-hidden border-b-4 border-panel-stroke">
        <Image
          src={banner.src}
          alt={banner.label}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Legibility wash so white text reads over any scene */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />

        {/* Top-left: live pulse when someone's studying */}
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          {room.occupants > 0 ? (
            <span className="flex items-center gap-1.5 rounded-full border-2 border-grass-deeper bg-grass-dark/90 px-2 py-0.5 font-silk text-[8px] uppercase tracking-widest text-ink">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
              Live
            </span>
          ) : (
            <span className="rounded-full border-2 border-panel-stroke bg-panel/80 px-2 py-0.5 font-silk text-[8px] uppercase tracking-widest text-ink/60">
              Quiet
            </span>
          )}
        </div>

        {/* Top-right: public / private chip */}
        <span
          className={`absolute right-2.5 top-2.5 flex items-center gap-1 border-2 px-2 py-0.5 font-silk text-[8px] uppercase tracking-widest shadow-pixel-sm ${
            room.isPrivate
              ? "border-barn-dark bg-barn text-panel"
              : "border-grass-deeper bg-sun text-ink"
          }`}
        >
          {room.isPrivate ? "🔒 Private" : "🌿 Public"}
        </span>

        {/* Bottom: room name */}
        <h2 className="absolute bottom-2 left-3 right-3 truncate font-jersey text-2xl leading-none text-panel [text-shadow:2px_2px_0_#173E2B]">
          {room.name}
        </h2>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4 pt-3.5">
        {/* Topic */}
        <p className="line-clamp-2 min-h-[2.5rem] font-pixelify text-sm leading-snug text-ink/70">
          {room.topic || "A cosy place to focus together."}
        </p>

        {/* Tags */}
        {room.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="border-2 border-sun-deep bg-sun/60 px-2 py-0.5 font-silk text-[8px] uppercase tracking-wider text-ink"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* People */}
        <div className="flex flex-col gap-1.5">
          {/* All-time joins — social proof that only ever grows */}
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1.5">
              {Array.from({ length: dots }).map((_, i) => (
                <span
                  key={i}
                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-panel bg-grass-dark text-[8px]"
                >
                  🐾
                </span>
              ))}
            </div>
            <span className="font-jersey text-sm text-ink">
              <span className="font-bold">{room.joined.toLocaleString()}</span>{" "}
              {room.joined === 1 ? "person has" : "people have"} joined
            </span>
          </div>

          {/* Live occupancy — how many are actually in the room right now */}
          <div className="flex items-center justify-between">
            <span className="font-press text-[8px] text-ink/50">
              {isFull ? "full" : `${room.occupants} here now`}
            </span>
            <span className="font-press text-[8px] text-ink/60">
              {room.occupants}/{room.capacity}
            </span>
          </div>
          <div className="h-2 overflow-hidden border-2 border-panel-stroke bg-panel-shadow">
            <div
              className={`h-full transition-all duration-500 ${
                isFull ? "bg-barn" : fillPct > 70 ? "bg-sun-deep" : "bg-grass-dark"
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Host + Join */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="min-w-0 truncate font-pixelify text-xs text-ink/50">
            host: <span className="font-bold text-ink">{room.host}</span>
          </span>
          <button
            type="button"
            disabled={isFull}
            data-sfx="off"
            // Public rooms join immediately (confirm); private rooms open the password
            // modal first (a lighter select).
            onClick={() => { playSfx(room.isPrivate ? "select" : "confirm"); onJoin(room); }}
            className={`tag shrink-0 ${
              isFull
                ? "cursor-not-allowed opacity-40"
                : "bg-sun transition-transform group-hover:-translate-y-0.5"
            }`}
          >
            {isFull ? "Full" : room.isPrivate ? "🔑 Enter" : "Join →"}
          </button>
        </div>
      </div>
    </div>
  );
}
