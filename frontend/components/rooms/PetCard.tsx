"use client";

import type { PetProgress, PetResponse } from "@/lib/api";
import { petStageSprite } from "@/lib/pets";

type Props = {
  progress: PetProgress;
  /** The user's chosen pet, if any (decides what hatches out of the egg). */
  pet: PetResponse | undefined;
};

const STAGE_LABEL = { EGG: "Egg", BABY: "Baby", GROWN: "Grown" } as const;

/** What the pet "says" — the hook that brings people back. */
function moodLine(progress: PetProgress, name: string): string {
  const { stage, mood } = progress;
  if (stage === "EGG") {
    if (mood === "SAD") return "The egg has gone cold… a study session would warm it up.";
    if (mood === "LONELY") return "The egg feels a little chilly. Come study with it?";
    return "Something is stirring inside… keep studying to hatch it!";
  }
  if (mood === "SAD") return `${name} hasn't seen you in days 🥺 Let's grow together again.`;
  if (mood === "LONELY") return `${name} missed you yesterday. Study a little today?`;
  return `${name} is happy you're here! ✨`;
}

export default function PetCard({ progress, pet }: Props) {
  const name = pet?.petName ?? "Your pet";
  const { src, scale } = petStageSprite(pet?.spriteKey, progress.stage);

  // Progress through the CURRENT stage, so the bar restarts after each evolution.
  const next = progress.nextStageXp;
  const pct =
    next == null
      ? 100
      : Math.min(100, Math.round((100 * (progress.xp - progress.stageMinXp)) / (next - progress.stageMinXp)));
  const nextLabel = progress.stage === "EGG" ? "hatches" : "grows up";

  return (
    <div className="panel flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-press text-[10px] text-ink tracking-widest uppercase">My Pet</h3>
        <span className="font-press text-[8px] text-ink/70 tracking-widest">
          {STAGE_LABEL[progress.stage].toUpperCase()}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-24 h-24 shrink-0 border-[4px] border-panel-stroke day-sky flex items-center justify-center overflow-hidden">
          <img
            src={src}
            alt={progress.stage === "EGG" ? "pet egg" : name}
            style={{ width: `${scale * 100}%` }}
            className={`max-w-none shrink-0 [image-rendering:pixelated] transition-[filter] duration-500 ${
              progress.mood === "SAD" ? "saturate-[.35] opacity-80" : progress.mood === "LONELY" ? "saturate-[.7]" : ""
            }`}
          />
        </div>

        {/* Speech bubble */}
        <p aria-live="polite" className="flex-1 border-[3px] border-panel-stroke bg-white/60 px-3 py-2 font-pixelify text-sm text-ink leading-snug">
          {moodLine(progress, name)}
        </p>
      </div>

      <div>
        <div className="h-2.5 w-full border-[2px] border-panel-stroke bg-white/50">
          <div className="h-full bg-grass-dark transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between font-press text-[7px] text-ink/70 tracking-wide">
          <span>{progress.xp} XP</span>
          <span>{next == null ? "FULLY GROWN 🌟" : `${nextLabel.toUpperCase()} AT ${next} XP`}</span>
        </div>
        <p className="mt-2 font-pixelify text-xs text-ink/70">
          +1 XP per minute studied · +10 for your first session of the day
        </p>
      </div>
    </div>
  );
}
