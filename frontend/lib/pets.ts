import type { StaticImageData } from "next/image";
import catFront from "@/assets/cat/cat-front.gif";
import catWalk from "@/assets/cat/cat-walk2.gif";
import humanFront from "@/assets/human/human-front.gif";
import humanWalk from "@/assets/human/human-walk.gif";
// NOTE: cow and chicken don't have a "-front.gif" asset yet, only "-walk.gif",
// so we fall back to the walk sprite for those two. Drop in cow-front.gif /
// chicken-front.gif here later and they'll be picked up automatically.
import cowWalk from "@/assets/cow/cow-walk.gif";
import chickenWalk from "@/assets/chicken/chicken-walk.gif";

// Maps a pet's spriteKey (from the backend) to its STATIONARY avatar image.
// Used when showing a pet standing still (e.g. in a profile).
export const PET_AVATARS: Record<string, StaticImageData> = {
  cat: catFront,
  human: humanFront,
  cow: cowWalk,
  chicken: chickenWalk,
};

// Maps a pet's spriteKey to its WALKING animation. Used for the farm scene
// where pets stroll around autonomously. Same keys as PET_AVATARS.
export const PET_WALKS: Record<string, StaticImageData> = {
  cat: catWalk,
  human: humanWalk,
  cow: cowWalk,
  chicken: chickenWalk,
};

// The avatar to show when a user hasn't chosen a pet yet.
export const DEFAULT_AVATAR = catFront;
export const DEFAULT_WALK = catWalk;

/** Returns the stationary avatar image src for a spriteKey, falling back to the default. */
export function petAvatarSrc(spriteKey: string | null | undefined): string {
  if (spriteKey && PET_AVATARS[spriteKey]) {
    return PET_AVATARS[spriteKey].src;
  }
  return DEFAULT_AVATAR.src;
}

/** Returns the walking animation src for a spriteKey, falling back to the default. */
export function petWalkSrc(spriteKey: string | null | undefined): string {
  if (spriteKey && PET_WALKS[spriteKey]) {
    return PET_WALKS[spriteKey].src;
  }
  return DEFAULT_WALK.src;
}
