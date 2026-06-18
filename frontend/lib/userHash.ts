// Given a userId, return stable "randomish" values for positioning/animating
// a pet walker. Same userId always returns the same values, so a pet consistently
// appears at the same height and moves at the same speed when that user joins.

export function userTopPercent(userId: string): number {
  // Hash userId to a value 0-1, then map to vertical range (25%-55%).
  // Wider spread so pets don't stack on top of each other.
  const hash = hashString(userId);
  // Normalize hash to 0-1 by using modulo to get fractional part
  const normalized = (hash % 1000) / 1000;
  return 25 + normalized * 30; // 25% to 55%
}

export function userWalkSpeed(userId: string): number {
  // Hash userId to a walking speed (4–12 percent-per-second).
  // Variety so pets don't all move at the same boring pace.
  const hash = hashString(userId);
  return 4 + ((hash >> 8) % 9);  // Use different bits for speed
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
