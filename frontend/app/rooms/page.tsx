"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Water from "@/assets/gifs/water-background.gif";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import RoomCard from "@/components/rooms/RoomCard";
import PasswordModal from "@/components/rooms/PasswordModal";
import CreateRoomModal, { type CreateRoomData } from "@/components/rooms/CreateRoomModal";
import { toRoom, type Room } from "@/lib/rooms";
import { roomApi, ApiError, type CreateRoomRequest, type UserResponse } from "@/lib/api";

type Filter = "all" | "public" | "private";

// Shared cache key for the rooms list. Reuse this anywhere that reads
// or invalidates the same data so TanStack keeps a single cached copy.
const ROOMS_KEY = ["rooms"] as const;

export default function RoomsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Cached fetch of all rooms (GET /api/rooms). TanStack dedupes requests,
  // serves from cache between visits, and tracks loading/error for us.
  const { data: rooms = [], isLoading: loading, error } = useQuery({
    queryKey: ROOMS_KEY,
    queryFn: async () => (await roomApi.list()).map(toRoom),
  });
  const loadError = error
    ? error instanceof ApiError
      ? error.message
      : "Failed to load rooms"
    : null;

  // Create a room, then invalidate the rooms cache so the list refetches.
  const createRoom = useMutation({
    mutationFn: (body: CreateRoomRequest) => roomApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
    },
  });

  const visible = rooms.filter((r) => {
    if (filter === "public" && r.isPrivate) return false;
    if (filter === "private" && !r.isPrivate) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.topic.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Actually join the room on the backend before navigating. This creates the
  // belong_room membership (so the user can use the shared to-do list etc.) and
  // updates the occupant count. Idempotent, so re-entering a room is fine.
  async function enterRoom(room: Room, password?: string) {
    const stored = localStorage.getItem("user");
    if (!stored) {
      setJoinError("You must be logged in to join a room.");
      return;
    }
    const user = JSON.parse(stored) as UserResponse;

    try {
      await roomApi.join(room.id, user.userId, password);
      // Refresh the rooms list so the new occupant count shows up.
      queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
      setPendingRoom(null);
      setJoinError(null);
      router.push(`/study-room?room=${room.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to join room";
      setJoinError(message);
    }
  }

  function handleJoin(room: Room) {
    setJoinError(null);
    if (room.isPrivate) {
      // Private rooms need a password, collected by the modal.
      setPendingRoom(room);
    } else {
      enterRoom(room);
    }
  }

  function handlePasswordConfirm(password: string) {
    // The backend verifies the password as part of joining.
    enterRoom(pendingRoom!, password);
  }

  async function handleCreateRoom(data: CreateRoomData) {
    setCreateError(null);

    // hostId comes from the user we saved at login (see app/login/page.tsx).
    const stored = localStorage.getItem("user");
    if (!stored) {
      setCreateError("You must be logged in to create a room.");
      return;
    }
    const user = JSON.parse(stored) as UserResponse;

    try {
      // Tags typed in the modal are sent as names; the backend creates any that
      // don't exist yet (getOrCreate) and links them to the room.
      // The mutation's onSuccess invalidates the cache, so the list refreshes.
      const room = await createRoom.mutateAsync({
        hostId: user.userId,
        name: data.name,
        description: data.description,
        capacity: data.capacity,
        isPrivate: data.isPrivate,
        password: data.password,
        tags: data.tags,
      });
      setShowCreate(false);
      router.push(`/study-room?room=${room.roomId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create room";
      setCreateError(message);
    }
  }


  return (
    <main
      className="relative min-h-screen px-7 pt-5 pb-24 z-[1]"
      style={{ backgroundColor: "#aee7bc" }}

    >
      <NavMenu />
      <Header />

      <div className="max-w-[1240px] mx-auto mt-6">
        {/* Page heading + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-jersey text-4xl text-ink [text-shadow:2px_2px_0_#FFD66B]">
              Study Rooms
            </h1>
            <p className="font-press text-[8px] text-ink/50 mt-1 tracking-widest">
              {loading ? "LOADING…" : `${rooms.length} ROOMS AVAILABLE`}
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {/* Create room button */}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="tag active bg-sun hover:bg-sun-deep whitespace-nowrap"
            >
              + Create Room
            </button>

            {/* Search */}
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms…"
              className="bg-panel border-[3px] border-panel-stroke px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 focus:border-grass-dark w-full sm:w-64"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "public", "private"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`tag capitalize ${filter === f ? "active" : ""}`}
            >
              {f === "all" ? "All" : f === "public" ? "🌿 Public" : "🔒 Private"}
            </button>
          ))}
        </div>

        {/* Join error (public rooms have no modal to show it in) */}
        {joinError && !pendingRoom && (
          <div className="panel mb-4 py-3 text-center">
            <p className="font-press text-[10px] text-barn">{joinError}</p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="panel flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl animate-pulse">🌱</span>
            <p className="font-press text-[10px] text-ink/50">Loading rooms…</p>
          </div>
        ) : loadError ? (
          <div className="panel flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl">🚜</span>
            <p className="font-press text-[10px] text-barn">{loadError}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl">🌾</span>
            <p className="font-press text-[10px] text-ink/50">No rooms found</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((room) => {
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={handleJoin}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Password modal */}
      {pendingRoom && (
        <PasswordModal
          room={pendingRoom}
          onConfirm={handlePasswordConfirm}
          onClose={() => { setPendingRoom(null); setJoinError(null); }}
          serverError={joinError}
        />
      )}

      {/* Create room modal */}
      {showCreate && (
        <CreateRoomModal
          onConfirm={handleCreateRoom}
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          serverError={createError}
        />
      )}
    </main>
  );
}
