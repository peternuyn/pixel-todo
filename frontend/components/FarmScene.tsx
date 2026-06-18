"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import theme1 from "@/assets/theme-room1.svg";
import theme2 from "@/assets/theme-room2.svg";
import theme3 from "@/assets/theme-room3.svg";
import theme4 from "@/assets/theme-room4.svg";
import WalkingPet from "./WalkingPet";
import waterBg from "@/assets/gifs/water-background.gif";
import { petApi, userApi, roomPresenceApi, PresenceEvent } from "@/lib/api";
import { petWalkSrc } from "@/lib/pets";
import { subscribeRoom } from "@/lib/ws";
import { userTopPercent, userWalkSpeed } from "@/lib/userHash";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const THEMES = [
  { id: 1, label: "Meadow", src: theme1 },
  { id: 2, label: "Sunset", src: theme2 },
  { id: 3, label: "Forest", src: theme3 },
  { id: 4, label: "Night",  src: theme4 },
];

type Walker = {
  userId: string;
  displayName: string;
  walkSrc: string;
  top: string;
  speed: number;
};

export default function FarmScene({ roomId }: { roomId: string | null }) {
  const [zoom, setZoom] = useState(1.3);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [themeId, setThemeId] = useState(3);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walkers, setWalkers] = useState<Walker[]>([]);

  const activeTheme = THEMES.find((t) => t.id === themeId)!;

  // Caches to avoid re-fetching on every useEffect.
  const petMapRef = useRef<Map<string, string> | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP));
  const zoomOut = () =>
    setZoom((z) => {
      const next = clampZoom(z - ZOOM_STEP);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Load walkers on room join. Fetch pet catalog once, then presence snapshot,
  // then load user data for each present user. This happens only once per roomId change.
  useEffect(() => {
    if (!roomId) {
      setWalkers([]);
      return;
    }

    let active = true;

    (async () => {
      try {

        // Ensure we have the pet id -> spriteKey map. Cache it so presence join events don't refetch.
        if (!petMapRef.current) {
          const pets = await petApi.list();
          const map = new Map(pets.map((p) => [p.petId, p.spriteKey]));
          petMapRef.current = map;
        }

        // Get who's in the room right now.
        const presentIds = await roomPresenceApi.snapshot(roomId);
        if (!active) return;

        if (presentIds.length === 0) {
          setWalkers([]);
          return;
        }

        // Load user data for each present user in parallel, then build the walker list.
        const walkerPromises = presentIds.map(async (userId) => {
          const user = await userApi.getById(userId);
          const spriteKey = petMapRef.current?.get(user.petId ?? "") ?? null;
          const walkSrc = petWalkSrc(spriteKey);
          return {
            userId,
            displayName: user.displayName,
            walkSrc,
            top: `${userTopPercent(userId)}%`,
            speed: userWalkSpeed(userId),
          };
        });
        const loadedWalkers = await Promise.all(walkerPromises);
        if (active) {
          setWalkers(loadedWalkers);
        }
      } catch (err) {
        // Silently fail — the farm degrades to decorative mode with no dynamic pets.
        console.error("[FarmScene] Failed to load presence walkers:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [roomId]);

  // Subscribe to presence join/leave events and update walker list in real-time.
  useEffect(() => {
    if (!roomId) return;

    return subscribeRoom<PresenceEvent>(roomId, "presence", (event) => {
      if (event.type === "join") {
        // Someone joined. Fetch their user data asynchronously.
        if (!event.userId) return;

        userApi.getById(event.userId)
          .then((user) => {
            const spriteKey = petMapRef.current?.get(user.petId ?? "") ?? null;
            const walkSrc = petWalkSrc(spriteKey);
            const walker: Walker = {
              userId: event.userId,
              displayName: user.displayName,
              walkSrc,
              top: `${userTopPercent(event.userId)}%`,
              speed: userWalkSpeed(event.userId),
            };

            // Only add if not already present (deduplication).
            setWalkers((prev) =>
              prev.some((w) => w.userId === event.userId)
                ? prev
                : [...prev, walker]
            );
          })
          .catch((err) => {
            console.error("[FarmScene] Failed to fetch user", event.userId, err);
          });
      } else if (event.type === "leave") {
        setWalkers((prev) => prev.filter((w) => w.userId !== event.userId));
      }
    });
  }, [roomId]);

  // Native non-passive wheel listener so preventDefault() actually blocks
  // trackpad pinch-to-zoom (which fires wheel events with ctrlKey=true)
  // and regular page scroll from leaking through.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      // Trackpad pinch sends large deltaY values with ctrlKey; soften it.
      const scale = e.ctrlKey ? 0.01 : 0.002;
      const delta = -e.deltaY * scale;
      setZoom((z) => {
        const next = clampZoom(z + delta);
        if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= MIN_ZOOM) return;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
    };
    setDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({
      x: dragState.current.baseX + dx,
      y: dragState.current.baseY + dy,
    });
  };

  const endDrag = () => {
    dragState.current = null;
    setDragging(false);
  };

  // Cat-paw cursors (match the global ones in globals.css). Inline styles
  // override CSS, so we set the paw URLs here directly.
  const PAW_DEFAULT = 'url("/cursors/catpaw_mouse_icon1.png") 8 4, default';
  const PAW_POINTING = 'url("/cursors/catpaw_pointing_mouse_icon2.png") 12 4, grab';
  const PAW_HOLDING = 'url("/cursors/catpaw_holding_mouse_icon_3.png") 12 4, grabbing';

  const cursor =
    zoom <= MIN_ZOOM ? PAW_DEFAULT : dragging ? PAW_HOLDING : PAW_POINTING;

  return (
    <div
      ref={stageRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      className="relative w-full h-full overflow-hidden flex items-center justify-center select-none [overscroll-behavior:contain] [touch-action:none]"
      style={{ cursor }}
    >
      {/* Animated water background — bottom layer, behind the farm scene */}
      <div
        className="absolute inset-0 pointer-events-none [image-rendering:pixelated]"
        style={{
          backgroundImage: `url(${waterBg.src})`,
          backgroundRepeat: "repeat",
        }}
      />

      {/* The transform stage — everything scales/pans together */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        
        <div className="relative h-full aspect-square max-w-full">
          <Image
            src={activeTheme.src}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 900px) 80vw, 50vw"
            className="object-contain [image-rendering:pixelated] pointer-events-none"
          />

          {/* Pets — positioned relative to the hills tile */}
          {roomId && walkers.length > 0 && (
            walkers.map((w) => (
              <WalkingPet
                key={w.userId}
                src={w.walkSrc}
                name={w.displayName}
                top={w.top}
                width="12%"
                speed={w.speed}
                minX={10}
                maxX={95}
              />
            ))
          )}
        
        </div>
      </div>

      {/* Theme picker — top-left of the stage */}
      <div className="absolute top-3 left-3 z-10">
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-1.5 bg-panel border-[3px] border-panel-stroke shadow-pixel-sm px-2.5 py-1.5 font-silk text-[9px] text-ink active:translate-y-[2px] active:shadow-none"
        >
          🎨 {activeTheme.label} ▾
        </button>
        {dropdownOpen && (
          <div className="mt-1 flex flex-col bg-panel border-[3px] border-panel-stroke shadow-pixel">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setThemeId(t.id); setDropdownOpen(false); }}
                className={`px-3 py-2 font-silk text-[9px] text-left hover:bg-sun/50 active:bg-sun ${themeId === t.id ? "bg-sun/30 font-bold" : ""}`}
              >
                {themeId === t.id ? "✓ " : "  "}{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zoom controls — outside the transform, fixed to the stage */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="w-9 h-9 flex items-center justify-center bg-panel border-[3px] border-panel-stroke shadow-pixel-sm font-press text-[12px] text-ink disabled:opacity-40 active:translate-y-[2px] active:shadow-none"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="w-9 h-9 flex items-center justify-center bg-panel border-[3px] border-panel-stroke shadow-pixel-sm font-press text-[12px] text-ink disabled:opacity-40 active:translate-y-[2px] active:shadow-none"
        >
          −
        </button>
        {zoom > MIN_ZOOM && (
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={reset}
            className="w-9 h-9 flex items-center justify-center bg-panel border-[3px] border-panel-stroke shadow-pixel-sm font-silk text-[9px] text-ink active:translate-y-[2px] active:shadow-none"
          >
            1×
          </button>
        )}
      </div>
    </div>
  );
}
