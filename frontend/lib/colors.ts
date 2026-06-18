// A small palette pulled from the farm theme (see tailwind.config.ts). Each user
// is mapped to ONE stable color by hashing their id, so a person's live cursor and
// their pen strokes always look the same to everyone — that's the "who's who".

const PALETTE = [
  "#E8806B", // barn
  "#5FD9C4", // glow
  "#E7AE3A", // sun deep
  "#4E9D6C", // wood dark
  "#BE5240", // barn dark
  "#2FB6A0", // glow deep
  "#3F8E5E", // grass deeper
  "#6FC68C", // grass dark
];

/** Deterministic color for a user id — same id always returns the same color. */
export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    // Classic string hash: keep folding each char code in. The `| 0` keeps it a
    // 32-bit int so it doesn't grow without bound.
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
