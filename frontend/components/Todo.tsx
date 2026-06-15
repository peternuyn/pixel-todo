"use client";

import { useState } from "react";
import RoomTodo from "./RoomTodo";
import PersonalTodo from "./PersonalTodo";

type Tab = "room" | "my";

// The to-do panel in the study room. It's a single card with two tabs:
//   - "Room": the SHARED list, same for everyone in the room (backend-backed).
//   - "My":   the PERSONAL list, private to this user (localStorage-backed),
//             which follows them as they switch rooms.
// roomId comes from the page's ?room= query param; the Room tab needs it.
export default function Todo({ roomId }: { roomId: string | null }) {
  const [tab, setTab] = useState<Tab>("room");

  return (
    <section className="relative w-full p-5 pb-6 rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel flex flex-col justify-center">
      <div className="flex justify-between items-center mb-3.5">
        <div className="font-press text-[11px] flex items-center gap-2.5">
          <span>{tab === "room" ? "📝" : "🌱"}</span>
          <span>To-do</span>
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

      {tab === "room" ? <RoomTodo roomId={roomId} /> : <PersonalTodo />}
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
