"use client";

import Image from "next/image";
import Link from "next/link";
import Water from "@/assets/gifs/water-background.gif";
import CatGifSrc from "@/assets/gifs/meo-di-ve-phia-truoc-loop.gif";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import { MOCK_USER } from "@/lib/user";

export default function ProfilePage() {
  const user = MOCK_USER;

  return (
    <main
      className="relative min-h-screen px-7 pt-5 pb-24 z-[1]"
      style={{ 
        backgroundImage: `url(${Water.src})`,
        backgroundRepeat: 'repeat',
        backgroundSize: '64px 64px',  
      }}
    
    >
      <NavMenu />
      <Header />

      <div className="max-w-[1240px] mx-auto mt-6 flex flex-col gap-5">
        {/* Top row: avatar card + stats */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-[280px_1fr]">
          {/* Avatar card */}
          <div className="panel flex flex-col items-center gap-3 text-center">
            <div className="relative w-24 h-24 border-[4px] border-panel-stroke bg-day-sky overflow-hidden">
              <Image
                src={CatGifSrc.src}
                alt="avatar"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h2 className="font-jersey text-3xl text-ink leading-none">
                {user.displayName}
              </h2>
              <p className="font-silk text-[9px] text-ink/50 tracking-widest mt-1">
                @{user.username}
              </p>
            </div>
            <p className="font-pixelify text-sm text-ink/60 leading-snug">
              {user.bio}
            </p>
            <div className="w-full border-t-[3px] border-panel-stroke pt-3">
              <p className="font-press text-[8px] text-ink/40 tracking-widest">
                MEMBER SINCE {user.joinedAt.toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              className="tag w-full justify-center hover:bg-sun"
            >
              Edit Profile
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
            <StatCard value={`${user.totalStudyHours}h`} label="Total Study Time" icon="⏱️" />
            <StatCard value={user.sessionsCompleted} label="Sessions Done" icon="✅" />
            <StatCard value={`${user.currentStreak}d`} label="Current Streak" icon="🔥" highlight />
            <StatCard value={`${user.longestStreak}d`} label="Longest Streak" icon="🏆" />
            <StatCard value={user.roomsHosted} label="Rooms Hosted" icon="🏡" />
            <StatCard value={user.favoriteTag} label="Fave Tag" icon="🌿" />
          </div>
        </div>

        {/* Badges */}
        <div className="panel">
          <SectionHeading>Badges</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            {user.badges.map((badge) => (
              <div
                key={badge.id}
                title={badge.description}
                className="flex flex-col items-center gap-1.5 border-[3px] border-panel-stroke bg-panel-shadow/40 py-3 px-2 text-center"
              >
                <span className="text-3xl">{badge.icon}</span>
                <span className="font-press text-[8px] text-ink leading-tight">
                  {badge.label}
                </span>
                <span className="font-pixelify text-[10px] text-ink/50 leading-tight">
                  {badge.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent rooms */}
        <div className="panel">
          <div className="flex items-center justify-between">
            <SectionHeading>Recent Rooms</SectionHeading>
            <Link
              href="/rooms"
              className="font-press text-[8px] text-grass-dark underline-offset-2 hover:underline"
            >
              Browse all →
            </Link>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {user.recentRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between px-3 py-2.5 border-[3px] border-panel-stroke bg-panel-shadow/30 hover:bg-sun/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🌿</span>
                  <span className="font-pixelify text-sm text-ink font-bold">
                    {room.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-press text-[8px] text-ink/50">
                    {room.hours}h
                  </span>
                  <span className="font-press text-[8px] text-ink/40">
                    {room.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  value,
  label,
  icon,
  highlight,
}: {
  value: string | number;
  label: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`panel flex flex-col items-center gap-1 py-4 text-center ${
        highlight ? "bg-sun/40 border-sun-deep" : ""
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-jersey text-3xl text-ink leading-none">{value}</span>
      <span className="font-press text-[7px] text-ink/50 tracking-widest leading-tight">
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-press text-[10px] text-ink tracking-widest uppercase flex items-center gap-2">
      {children}
    </h3>
  );
}
