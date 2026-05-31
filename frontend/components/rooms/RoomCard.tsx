"use client";

import type { Room } from "@/lib/rooms";

type Props = {
  room: Room;
  onJoin: (room: Room) => void;
};

export default function RoomCard({ room, onJoin }: Props) {
  const fillPct = Math.round((room.occupants / room.capacity) * 100);
  const isFull = room.occupants >= room.capacity;

  return (
    <div className="panel flex flex-col gap-3 rounded-3xl">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{room.isPrivate ? "🔒" : "🌿"}</span>
          <h2 className="font-jersey text-2xl leading-none text-ink truncate">
            {room.name}
          </h2>
        </div>
        <span
          className={`font-silk text-[8px] uppercase tracking-widest px-2 py-1 border-[2px] shrink-0 ${
            room.isPrivate
              ? "border-barn bg-barn/10 text-barn"
              : "border-panel-stroke bg-wood-light text-ink"
          }`}
        >
          {room.isPrivate ? "Private" : "Public"}
        </span>
      </div>

      {/* Topic */}
      <p className="font-pixelify text-sm text-ink/70 leading-snug">
        {room.topic}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {room.tags.map((tag) => (
          <span
            key={tag}
            className="font-silk text-[8px] uppercase tracking-wider px-2 py-0.5 bg-sun/60 border-[2px] border-sun-deep text-ink"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="font-press text-[8px] text-ink/60">Occupants</span>
          <span className="font-press text-[8px] text-ink">
            {room.occupants}/{room.capacity}
          </span>
        </div>
        <div className="h-2.5 bg-panel-shadow border-[2px] border-panel-stroke overflow-hidden">
          <div
            className={`h-full transition-all ${
              isFull ? "bg-barn" : fillPct > 70 ? "bg-sun-deep" : "bg-grass"
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Host + Join */}
      <div className="flex items-center justify-between mt-1">
        <span className="font-pixelify text-xs text-ink/50">
          host: <span className="text-ink font-bold">{room.host}</span>
        </span>
        <button
          type="button"
          disabled={isFull}
          onClick={() => onJoin(room)}
          className={`tag ${isFull ? "opacity-40 cursor-not-allowed" : "hover:bg-sun"}`}
        >
          {isFull ? "Full" : room.isPrivate ? "🔑 Enter" : "Join →"}
        </button>
      </div>
    </div>
  );
}
