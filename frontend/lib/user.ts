// A profile badge, earned by hitting a real milestone in the user's stats.
// See earnedBadges() in app/profile/page.tsx.
export type Badge = {
  id: string;
  icon: string;
  label: string;
  description: string;
};
