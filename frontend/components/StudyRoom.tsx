"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FarmScene from "./FarmScene";

// Konva draws to a real <canvas> and touches the DOM at import time, so it can't
// run during server-side rendering. Loading it with ssr:false keeps it client-only.
const Whiteboard = dynamic(() => import("./Whiteboard"), { ssr: false });

type Tab = "video" | "whiteboard";

export default function StudyRoom({ roomId }: { roomId: string | null }) {
  const [tab, setTab] = useState<Tab>("video");

  return (
    <section className="panel rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel flex flex-col justify-center">
      <div className="flex justify-between items-center mb-3.5">
        <div className="font-press text-[11px] flex items-center gap-2.5">
          <span>📺</span>
          <span>Study room</span>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "video"} onClick={() => setTab("video")}>
            Video
          </TabButton>
          <TabButton
            active={tab === "whiteboard"}
            onClick={() => setTab("whiteboard")}
          >
            Whiteboard
          </TabButton>
        </div>
      </div>

      <div className="relative aspect-[16/9] day-sky overflow-hidden">
        {tab === "whiteboard" ? <Whiteboard roomId={roomId} /> : <FarmScene roomId={roomId} />}
      </div>
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
