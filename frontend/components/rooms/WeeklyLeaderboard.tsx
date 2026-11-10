"use client";

import { useQuery } from "@tanstack/react-query";
import { userApi, type PetResponse } from "@/lib/api";
import { petStageSprite } from "@/lib/pets";

type Props = {
  currentUserId: string | null;
  pets: PetResponse[];
};

const MEDALS = ["🥇", "🥈", "🥉"];

function formatHours(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function WeeklyLeaderboard({ currentUserId, pets }: Props) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard", "weekly"],
    queryFn: () => userApi.weeklyLeaderboard(),
    staleTime: 60_000, // it only moves when someone finishes a session
  });
  const spriteKeyById = new Map(pets.map((p) => [p.petId, p.spriteKey]));

  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <h3 className="font-press text-[10px] text-ink tracking-widest uppercase">This Week</h3>
        <span className="font-press text-[7px] text-ink/70 tracking-widest">RESETS MONDAY</span>
      </div>

      {isLoading ? (
        <p className="font-pixelify text-sm text-ink/70 mt-3">Counting the harvest…</p>
      ) : entries.length === 0 ? (
        <p className="font-pixelify text-sm text-ink/70 mt-3">
          Nobody has studied yet this week — be the first on the board! 🌱
        </p>
      ) : (
        <ol className="flex flex-col gap-2 mt-4">
          {entries.map((e, i) => {
            const isMe = e.userId === currentUserId;
            const { src, scale } = petStageSprite(spriteKeyById.get(e.petId ?? ""), e.petStage);
            return (
              <li
                key={e.userId}
                className={`flex items-center gap-3 px-3 py-2 border-[3px] border-panel-stroke ${
                  isMe ? "bg-sun/40" : "bg-panel-shadow/30"
                }`}
              >
                <span
                  className={`w-7 text-center ${MEDALS[i] ? "text-xl leading-none" : "font-press text-[10px] text-ink/70"}`}
                  aria-label={`Rank ${i + 1}`}
                >
                  {MEDALS[i] ?? i + 1}
                </span>
                <span aria-hidden className="w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden">
                  <img src={src} alt="" style={{ width: `${scale * 100}%` }} className="max-w-none shrink-0 [image-rendering:pixelated]" />
                </span>
                <span className="flex-1 truncate font-pixelify text-sm text-ink font-bold">
                  {e.displayName}
                  {isMe && <span className="ml-1.5 font-press text-[7px] text-ink/70">YOU</span>}
                </span>
                <span className="font-press text-[9px] text-ink">{formatHours(e.weekSeconds)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
