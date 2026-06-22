import type { RoomResponse } from "@/lib/api";

export type Room = {
  id: string;
  name: string;
  host: string;
  topic: string;
  isPrivate: boolean;
  occupants: number; // who is in the room RIGHT NOW (live WebSocket presence)
  joined: number; // all-time joins — the "X people have joined" social-proof count
  capacity: number;
  themeId: number; // 1=Meadow, 2=Sunset, 3=Forest, 4=Night — drives the card banner
  tags: string[];
};


export function toRoom(r: RoomResponse): Room {
  return {
    id: r.roomId,
    name: r.name,
    host: r.hostName, // the backend resolves the host's username for us
    topic: r.description ?? "",
    isPrivate: r.isPrivate,
    occupants: r.liveCount,
    joined: r.totalJoins,
    capacity: r.capacity,
    themeId: r.themeId,
    tags: r.tags,
  };
}
