import type { StaticImageData } from "next/image";
import catFront from "@/assets/cat/cat-front.gif";
import humanFront from "@/assets/human/human-front.gif";
// NOTE: cow and chicken don't have a "-front.gif" asset yet, only "-walk.gif",
// so we fall back to the walk sprite for those two. Drop in cow-front.gif /
// chicken-front.gif here later and they'll be picked up automatically.
import cowWalk from "@/assets/cow/cow-walk.gif";
import chickenWalk from "@/assets/chicken/chicken-walk.gif";

// Maps a pet's spriteKey (from the backend) to its avatar image. Keyed by the
// same spriteKey the backend stores ("cat", "cow", "chicken", "human"), so the
// frontend asset and backend record stay linked by that one string.
export const PET_AVATARS: Record<string, StaticImageData> = {
  cat: catFront,
  human: humanFront,
  cow: cowWalk,
  chicken: chickenWalk,
};

// The avatar to show when a user hasn't chosen a pet yet.
export const DEFAULT_AVATAR = catFront;

/** Returns the avatar image src for a spriteKey, falling back to the default. */
export function petAvatarSrc(spriteKey: string | null | undefined): string {
  if (spriteKey && PET_AVATARS[spriteKey]) {
    return PET_AVATARS[spriteKey].src;
  }
  return DEFAULT_AVATAR.src;
}
