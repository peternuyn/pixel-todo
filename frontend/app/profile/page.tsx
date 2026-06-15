"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Water from "@/assets/gifs/water-background.gif";
import Header from "@/components/Header";
import NavMenu from "@/components/NavMenu";
import EditProfileModal from "@/components/profile/EditProfileModal";
import {
  userApi,
  roomApi,
  sessionApi,
  petApi,
  getStoredUser,
  ApiError,
  type UserResponse,
} from "@/lib/api";
import { petAvatarSrc } from "@/lib/pets";
import type { Badge } from "@/lib/user";

export default function ProfilePage() {
  // Read the logged-in user from localStorage AFTER mount. Doing it in an
  // effect (not during render) keeps the server-rendered HTML and the first
  // client render identical, which avoids React hydration mismatch warnings.
  const [storedUser, setStoredUser] = useState<UserResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setStoredUser(getStoredUser());
    setMounted(true);
  }, []);
  const userId = storedUser?.userId;

  // Fresh user record (stats can change after we logged in, so we refetch).
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => userApi.getById(userId!),
    enabled: !!userId, // don't run until we know who we are
  });

  // Rooms this user hosts — powers the "rooms hosted" count and favourite tag.
  const { data: hostedRooms = [] } = useQuery({
    queryKey: ["rooms", "host", userId],
    queryFn: () => roomApi.listByHost(userId!),
    enabled: !!userId,
  });

  // Past study sessions — powers the "recent rooms" list.
  const { data: history = [] } = useQuery({
    queryKey: ["sessions", "history", userId],
    queryFn: () => sessionApi.history(userId!),
    enabled: !!userId,
  });

  // All rooms (shares the cache with the rooms page) so we can turn the
  // roomId on each session into a readable room name.
  const { data: allRooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomApi.list(),
  });

  // The pet catalog — used to resolve the user's petId into an avatar sprite
  // and to offer the choices in the edit modal.
  const { data: pets = [] } = useQuery({
    queryKey: ["pets"],
    queryFn: () => petApi.list(),
  });

  // --- edit profile ---
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const updateProfile = useMutation({
    mutationFn: (data: { displayName: string; bio: string; petId: string | null }) =>
      userApi.updateProfile(userId!, data.displayName, data.bio, data.petId),
    onSuccess: (updated) => {
      // Keep localStorage in sync so other pages (e.g. the header) see the new
      // name, then refetch the profile query and close the modal.
      localStorage.setItem("user", JSON.stringify(updated));
      setStoredUser(updated);
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      setShowEdit(false);
      setEditError(null);
    },
  });

  async function handleEditProfile(data: { displayName: string; bio: string; petId: string | null }) {
    setEditError(null);
    try {
      await updateProfile.mutateAsync(data);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : "Failed to save profile");
    }
  }

  // --- loading / not-logged-in states ---
  if (!mounted || (userId && isLoading)) {
    return <CenteredMessage emoji="🌱" text="Loading profile…" />;
  }
  if (!userId) {
    return (
      <CenteredMessage emoji="🔒" text="Log in to see your profile">
        <Link href="/login" className="tag active bg-sun hover:bg-sun-deep mt-2">
          Go to login →
        </Link>
      </CenteredMessage>
    );
  }
  if (isError || !user) {
    return <CenteredMessage emoji="🚜" text="Couldn't load your profile" />;
  }

  // --- derive the values the backend doesn't store directly ---
  // The avatar is the user's chosen pet: find it in the catalog by petId, then
  // map its spriteKey to the matching gif (falls back to the default cat).
  const currentPet = pets.find((p) => p.petId === user.petId);
  const avatarSrc = petAvatarSrc(currentPet?.spriteKey);
  const roomById = new Map(allRooms.map((r) => [r.roomId, r.name]));
  const favoriteTag = mostCommonTag(hostedRooms.flatMap((r) => r.tags));
  const recentRooms = history
    .filter((s) => s.durationSeconds != null) // only finished sessions have a duration
    .slice(0, 5)
    .map((s) => ({
      id: s.sessionId,
      name: s.roomId ? roomById.get(s.roomId) ?? "Study Room" : "Personal Study",
      hours: Math.round(((s.durationSeconds ?? 0) / 3600) * 10) / 10,
      date: formatDate(s.startedAt),
    }));
  const badges = earnedBadges({
    totalStudyHours: user.totalStudyHours,
    sessionsDone: user.sessionsDone,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    roomsHosted: hostedRooms.length,
  });

  return (
    <main
      className="relative min-h-screen px-7 pt-5 pb-24 z-[1]"
      style={{
        backgroundImage: `url(${Water.src})`,
        backgroundRepeat: "repeat",
        backgroundSize: "64px 64px",
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
                src={avatarSrc}
                alt="avatar"
                fill
                className="object-contain"
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
                MEMBER SINCE {formatMonthYear(user.createdAt).toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setEditError(null); setShowEdit(true); }}
              className="tag w-full justify-center hover:bg-sun"
            >
              Edit Profile
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
            <StatCard value={`${user.totalStudyHours.toFixed(1)}h`} label="Total Study Time" icon="⏱️" />
            <StatCard value={user.sessionsDone} label="Sessions Done" icon="✅" />
            <StatCard value={`${user.currentStreak}d`} label="Current Streak" icon="🔥" highlight />
            <StatCard value={`${user.longestStreak}d`} label="Longest Streak" icon="🏆" />
            <StatCard value={hostedRooms.length} label="Rooms Hosted" icon="🏡" />
            <StatCard value={favoriteTag ?? "—"} label="Fave Tag" icon="🌿" />
          </div>
        </div>

        {/* Badges */}
        <div className="panel">
          <SectionHeading>Badges</SectionHeading>
          {badges.length === 0 ? (
            <p className="font-pixelify text-sm text-ink/50 mt-3">
              No badges yet — keep studying to earn some! 🌱
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              {badges.map((badge) => (
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
          )}
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
          {recentRooms.length === 0 ? (
            <p className="font-pixelify text-sm text-ink/50 mt-3">
              No study sessions yet. Join a room and start the clock! ⏱️
            </p>
          ) : (
            <div className="flex flex-col gap-2 mt-4">
              {recentRooms.map((room) => (
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
                    <span className="font-press text-[8px] text-ink/50">{room.hours}h</span>
                    <span className="font-press text-[8px] text-ink/40">{room.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit profile modal */}
      {showEdit && (
        <EditProfileModal
          initialDisplayName={user.displayName}
          initialBio={user.bio}
          initialPetId={user.petId}
          pets={pets}
          onConfirm={handleEditProfile}
          onClose={() => { setShowEdit(false); setEditError(null); }}
          serverError={editError}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Derivation helpers (turn raw backend data into the display values)
// ---------------------------------------------------------------------------

/** Returns the tag that appears most often, or null if the list is empty. */
function mostCommonTag(tags: string[]): string | null {
  if (tags.length === 0) return null;
  const counts = new Map<string, number>();
  for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  let best = tags[0];
  for (const [tag, count] of counts) {
    if (count > (counts.get(best) ?? 0)) best = tag;
  }
  return best;
}

/** Badges are earned by hitting real milestones in the user's stats. */
function earnedBadges(stats: {
  totalStudyHours: number;
  sessionsDone: number;
  currentStreak: number;
  longestStreak: number;
  roomsHosted: number;
}): Badge[] {
  const all: (Badge & { earned: boolean })[] = [
    { id: "first-session", icon: "🌱", label: "Sprout", description: "Did your first session", earned: stats.sessionsDone >= 1 },
    { id: "streak-7", icon: "🔥", label: "On Fire", description: "7-day study streak", earned: stats.currentStreak >= 7 || stats.longestStreak >= 7 },
    { id: "sessions-50", icon: "✅", label: "Dedicated", description: "50+ sessions done", earned: stats.sessionsDone >= 50 },
    { id: "host", icon: "🏡", label: "Host", description: "Hosted 5+ rooms", earned: stats.roomsHosted >= 5 },
    { id: "century", icon: "💯", label: "Century", description: "100+ study hours", earned: stats.totalStudyHours >= 100 },
  ];
  return all.filter((b) => b.earned);
}

/** "Jun 7, 2026" */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** "March 2025" */
function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

function CenteredMessage({
  emoji,
  text,
  children,
}: {
  emoji: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      className="relative min-h-screen px-7 pt-5 pb-24 z-[1]"
      style={{
        backgroundImage: `url(${Water.src})`,
        backgroundRepeat: "repeat",
        backgroundSize: "64px 64px",
      }}
    >
      <NavMenu />
      <Header />
      <div className="max-w-[1240px] mx-auto mt-20 flex justify-center">
        <div className="panel flex flex-col items-center gap-3 py-12 px-10 text-center">
          <span className="text-4xl">{emoji}</span>
          <p className="font-press text-[10px] text-ink/60">{text}</p>
          {children}
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
