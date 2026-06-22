"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import RoomCard from "@/components/rooms/RoomCard";
import PasswordModal from "@/components/rooms/PasswordModal";
import CreateRoomModal, { type CreateRoomData } from "@/components/rooms/CreateRoomModal";
import { toRoom, type Room } from "@/lib/rooms";
import { roomApi, ApiError, getStoredUser, type CreateRoomRequest } from "@/lib/api";

type Filter = "all" | "public" | "private";

// Small pixel stat chip used in the hero (rooms / studying / open counts).
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline gap-1.5 border-2 border-panel-stroke bg-panel/70 px-2.5 py-1">
      <span className="font-jersey text-xl leading-none text-ink">{value}</span>
      <span className="font-silk text-[8px] uppercase tracking-widest text-ink/50">{label}</span>
    </div>
  );
}

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
    onSuccess: (_room, body) => {
      queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
      // Hosting a room can unlock the Homesteader badge. Refetch the badge list so
      // BadgeToaster notices and pops the achievement even if the live WebSocket
      // push was missed 
      queryClient.invalidateQueries({ queryKey: ["badges", body.hostId] });
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
    const user = getStoredUser();
    if (!user) {
      setJoinError("You must be logged in to join a room.");
      return;
    }

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
    const user = getStoredUser();
    if (!user) {
      setCreateError("You must be logged in to create a room.");
      return;
    }

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
        {/* Hero banner */}
        <div className="panel relative mb-6 overflow-hidden rounded-3xl !p-6 sm:!p-8">
          {/* Soft sun glow flourish in the corner */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sun/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-grass-dark/20 blur-2xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 border-2 border-grass-deeper bg-grass-light px-2.5 py-1 font-silk text-[8px] uppercase tracking-widest text-ink">
                🌿 Co-working
              </span>
              <h1 className="mt-3 font-jersey text-5xl leading-none text-ink [text-shadow:3px_3px_0_#FFD66B]">
                Study Rooms
              </h1>
              <p className="mt-2 max-w-md font-pixelify text-sm text-ink/60">
                Drop into a cosy room, focus alongside friends, and grow your farm together.
              </p>

              {/* Quick stats */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Stat label="Rooms" value={loading ? "—" : rooms.length} />
                <Stat
                  label="Studying"
                  value={loading ? "—" : rooms.reduce((n, r) => n + r.occupants, 0)}
                />
                <Stat
                  label="Open"
                  value={loading ? "—" : rooms.filter((r) => !r.isPrivate).length}
                />
              </div>
            </div>

            {/* Create room CTA */}
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="tag active cta-glow shrink-0 whitespace-nowrap !px-5 !py-3 !text-[11px]"
            >
              + Create Room
            </button>
          </div>
        </div>

        {/* Filter pills + search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {(["all", "public", "private"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`tag capitalize ${filter === f ? "active" : ""}`}
              >
                {f === "all" ? "✦ All" : f === "public" ? "🌿 Public" : "🔒 Private"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">
              🔍
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms…"
              className="w-full border-[3px] border-panel-stroke bg-panel py-2 pl-9 pr-3 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 focus:border-grass-dark"
            />
          </div>
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
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((room, i) => (
              <div
                key={room.id}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <RoomCard room={room} onJoin={handleJoin} />
              </div>
            ))}
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
