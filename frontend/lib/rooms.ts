export type Room = {
  id: string;
  name: string;
  host: string;
  topic: string;
  isPrivate: boolean;
  occupants: number;
  capacity: number;
  tags: string[];
};

export const MOCK_ROOMS: Room[] = [
  {
    id: "cozy-meadow",
    name: "Cozy Meadow",
    host: "mochi",
    topic: "Deep work — no distractions",
    isPrivate: false,
    occupants: 4,
    capacity: 8,
    tags: ["focus", "silent"],
  },
  {
    id: "sunflower-study",
    name: "Sunflower Study",
    host: "biscuit",
    topic: "Uni finals grind",
    isPrivate: false,
    occupants: 7,
    capacity: 10,
    tags: ["study", "chill"],
  },
  {
    id: "barn-night-owl",
    name: "Barn Night Owls",
    host: "noodle",
    topic: "Late night coding session",
    isPrivate: false,
    occupants: 2,
    capacity: 6,
    tags: ["coding", "late"],
  },
  {
    id: "secret-garden",
    name: "Secret Garden",
    host: "pumpkin",
    topic: "Friends only — language learning",
    isPrivate: true,
    occupants: 3,
    capacity: 5,
    tags: ["language", "private"],
  },
  {
    id: "moonlit-barn",
    name: "Moonlit Barn",
    host: "pretzel",
    topic: "Art & design sprint",
    isPrivate: true,
    occupants: 1,
    capacity: 4,
    tags: ["art", "private"],
  },
  {
    id: "clover-patch",
    name: "Clover Patch",
    host: "dumpling",
    topic: "Math & science homework",
    isPrivate: false,
    occupants: 5,
    capacity: 8,
    tags: ["math", "science"],
  },
];
