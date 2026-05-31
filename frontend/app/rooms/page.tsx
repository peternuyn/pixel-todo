"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Water from "@/assets/nuoc_troi.svg";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import RoomCard from "@/components/rooms/RoomCard";
import PasswordModal from "@/components/rooms/PasswordModal";
import { MOCK_ROOMS, type Room } from "@/lib/rooms";

type Filter = "all" | "public" | "private";

export default function RoomsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);

  const visible = MOCK_ROOMS.filter((r) => {
    if (filter === "public" && r.isPrivate) return false;
    if (filter === "private" && !r.isPrivate) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.topic.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function handleJoin(room: Room) {
    if (room.isPrivate) {
      setPendingRoom(room);
    } else {
      router.push(`/study-room?room=${room.id}`);
    }
  }

  function handlePasswordConfirm(_password: string) {
    // In a real app, verify the password server-side before navigating.
    setPendingRoom(null);
    router.push(`/study-room?room=${pendingRoom!.id}`);
  }


  return (
    <main
      className="relative min-h-screen px-7 pt-5 pb-24 z-[1]"
      style={{ backgroundImage: `url(${Water.src})` }}
    >
      <NavMenu />
      <Header />

      <div className="max-w-[1240px] mx-auto mt-6">
        {/* Page heading + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-jersey text-4xl text-ink [text-shadow:2px_2px_0_#FFE89A]">
              Study Rooms
            </h1>
            <p className="font-press text-[8px] text-ink/50 mt-1 tracking-widest">
              {MOCK_ROOMS.length} ROOMS AVAILABLE
            </p>
          </div>

          {/* Search */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms…"
            className="bg-panel border-[3px] border-panel-stroke px-3 py-2 font-pixelify text-sm text-ink outline-none placeholder:text-ink/30 focus:border-grass-dark w-full sm:w-64"
          />
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

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-4xl">🌾</span>
            <p className="font-press text-[10px] text-ink/50">No rooms found</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>

      {/* Password modal */}
      {pendingRoom && (
        <PasswordModal
          room={pendingRoom}
          onConfirm={handlePasswordConfirm}
          onClose={() => setPendingRoom(null)}
        />
      )}
    </main>
  );
}
