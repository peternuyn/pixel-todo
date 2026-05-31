export type UserProfile = {
  username: string;
  displayName: string;
  bio: string;
  joinedAt: string;
  totalStudyHours: number;
  sessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  favoriteTag: string;
  roomsHosted: number;
  badges: Badge[];
  recentRooms: RecentRoom[];
};

export type Badge = {
  id: string;
  icon: string;
  label: string;
  description: string;
};

export type RecentRoom = {
  id: string;
  name: string;
  date: string;
  hours: number;
};

export const MOCK_USER: UserProfile = {
  username: "mochi",
  displayName: "Mochi",
  bio: "just a cat trying to finish assignments before 3am",
  joinedAt: "March 2025",
  totalStudyHours: 142,
  sessionsCompleted: 87,
  currentStreak: 5,
  longestStreak: 14,
  favoriteTag: "focus",
  roomsHosted: 12,
  badges: [
    { id: "early-bird", icon: "🌅", label: "Early Bird", description: "Studied before 7am" },
    { id: "night-owl", icon: "🦉", label: "Night Owl", description: "Studied past midnight" },
    { id: "streak-7", icon: "🔥", label: "On Fire", description: "7-day study streak" },
    { id: "host", icon: "🏡", label: "Host", description: "Hosted 10+ rooms" },
    { id: "century", icon: "💯", label: "Century", description: "100+ study hours" },
    { id: "social", icon: "🌿", label: "Social Leaf", description: "Joined 20+ rooms" },
  ],
  recentRooms: [
    { id: "cozy-meadow", name: "Cozy Meadow", date: "Today", hours: 2.5 },
    { id: "sunflower-study", name: "Sunflower Study", date: "Yesterday", hours: 1.0 },
    { id: "clover-patch", name: "Clover Patch", date: "May 28", hours: 3.0 },
    { id: "barn-night-owl", name: "Barn Night Owls", date: "May 27", hours: 1.5 },
  ],
};
