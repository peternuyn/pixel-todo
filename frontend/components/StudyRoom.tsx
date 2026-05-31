"use client";

import { useState } from "react";
import FarmScene from "./FarmScene";

type Tab = "video" | "whiteboard";

export default function StudyRoom() {
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
        <span className="absolute top-3 left-3.5 font-press text-[8px] text-sun bg-black/45 px-1.5 py-1 border-2 border-sun">
          {tab === "video" ? "VIDEO · LIVE" : "WHITEBOARD"}
        </span>
        <FarmScene />
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
