// A badge in the Meowdow catalog. Mirrors the backend's BadgeView record
// (com.meowdow.studyfarm.badge.BadgeView).
//
// The SAME shape covers three states:
//   - earned:       `earnedAt` is the ISO timestamp it was unlocked
//   - in progress:  `earnedAt` null, `progressCurrent`/`progressTarget` set (drives
//                   the "8 / 10 sessions" bar on a locked snapshot badge)
//   - locked:       all of the above null (an event badge you just have to trigger)
export type Badge = {
  key: string;
  emoji: string;
  label: string;
  description: string;
  category: string;
  earnedAt: string | null;
  progressCurrent: number | null;
  progressTarget: number | null;
};
