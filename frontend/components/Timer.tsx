"use client";

import { useState } from "react";
import RoomTimer from "./RoomTimer";
import PersonalTimer from "./PersonalTimer";

type Tab = "room" | "my";

// The timer panel in the study room. A single card with two tabs, mirroring the
// to-do panel:
//   - "Room": the SHARED clock, the same for everyone in the room (backend-backed,
//             synced live over WebSocket).
//   - "My":   the PERSONAL clock, private to this user (localStorage-backed), which
//             follows them as they switch rooms.
// roomId comes from the page's ?room= query param; the Room tab needs it.
export default function Timer({ roomId }: { roomId: string | null }) {
  const [tab, setTab] = useState<Tab>("room");

  return (
    <section className="relative w-full p-5 pb-6 rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel flex flex-col justify-center">
      <div className="flex justify-between items-center mb-3.5">
        <div className="font-press text-[11px] flex items-center gap-2.5">
          <span>{tab === "room" ? "⏰" : "🌱"}</span>
          <span>Timer</span>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "room"} onClick={() => setTab("room")}>
            Room
          </TabButton>
          <TabButton active={tab === "my"} onClick={() => setTab("my")}>
            My
          </TabButton>
        </div>
      </div>

      {tab === "room" ? <RoomTimer roomId={roomId} /> : <PersonalTimer />}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={`tag ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}
