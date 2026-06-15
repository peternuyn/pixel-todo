import type { RoomResponse } from "@/lib/api";

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


export function toRoom(r: RoomResponse): Room {
  return {
    id: r.roomId,
    name: r.name,
    host: r.hostName, // the backend resolves the host's username for us
    topic: r.description ?? "",
    isPrivate: r.isPrivate,
    occupants: r.totalMembers,
    capacity: r.capacity,
    tags: r.tags,
  };
}
