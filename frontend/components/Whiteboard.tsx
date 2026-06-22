"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Text, Circle } from "react-konva";
import type Konva from "konva";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  roomWhiteboardApi,
  WhiteboardObject,
  WhiteboardStroke,
  WhiteboardText,
  WhiteboardEvent,
  getStoredUser,
} from "@/lib/api";
import { subscribeRoom, publishRoom } from "@/lib/ws";
import { colorForUser } from "@/lib/colors";
import { isSfxMuted, onSfxMutedChange } from "@/lib/sfx";

// The shared drawing surface for one room. Like RoomTodo it keeps the DURABLE state
// (finished strokes/text) in a TanStack Query cache that the WebSocket keeps in sync.
// On top of that it adds a fast EPHEMERAL layer — live cursors and the stroke being
// dragged right now — that flies over the socket and is never stored.

// Pen/text geometry is stored in 0..1 fractions of the canvas, so it maps onto any
// screen. We convert to/from pixels right at the edges (render + pointer input).

const PEN_COLORS = ["#173E2B", "#E8806B", "#2FB6A0", "#E7AE3A", "#FFFFFF"];
const DEFAULT_FONT = 0.045; // text height as a fraction of the canvas height
const CURSOR_MS = 50; // throttle: at most one cursor frame every 50ms
const DRAW_MS = 33; // throttle: ~30 live-stroke frames a second
const STALE_MS = 4000; // drop a peer's cursor/preview if silent this long

// One other person's live state (not stored — rebuilt from socket frames).
type Cursor = { x: number; y: number; displayName: string; color: string; ts: number };
type LiveStroke = { points: number[]; color: string; width: number; ts: number };

// The ephemeral payloads we relay through /app/rooms/{id}/whiteboard-live.
type LiveMsg =
  | { kind: "cursor"; userId: string; displayName: string; color: string; x: number; y: number }
  | { kind: "draw"; userId: string; color: string; width: number; points: number[] };

export default function Whiteboard({ roomId }: { roomId: string | null }) {
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const myId = user?.userId ?? null;
  const myColor = myId ? colorForUser(myId) : "#173E2B";

  const [tool, setTool] = useState<"pen" | "text">("pen");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);

  // Canvas pixel size, measured from the container.
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // The stroke this user is currently dragging (normalized flat points), or null.
  const [localStroke, setLocalStroke] = useState<number[] | null>(null);
  const drawingRef = useRef(false);

  // Other people's live cursors / in-progress strokes, keyed by userId.
  const [cursors, setCursors] = useState<Record<string, Cursor>>({});
  const [liveStrokes, setLiveStrokes] = useState<Record<string, LiveStroke>>({});

  const lastCursor = useRef(0);
  const lastDraw = useRef(0);

  // Looping pencil sound played ONLY for this user while they draw a stroke. It's a
  // purely local sound effect — never broadcast — so peers don't hear your scribbling.
  const drawSoundRef = useRef<HTMLAudioElement | null>(null);

  const boardKey = ["roomWhiteboard", roomId] as const;

  // ----- durable board state (same pattern as RoomTodo) ---------------------
  const { data: objects = [] } = useQuery({
    queryKey: boardKey,
    queryFn: () => roomWhiteboardApi.list(roomId!),
    enabled: !!roomId,
  });

  // ----- measure the canvas, and keep it sized to the container -------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- durable deltas: apply WhiteboardEvents to the cache ----------------
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<WhiteboardEvent>(roomId, "whiteboard", (event) => {
      queryClient.setQueryData<WhiteboardObject[]>(boardKey, (old = []) => {
        if (event.type === "added") {
          if (old.some((o) => o.id === event.object.id)) return old; // we added it optimistically
          return [...old, event.object];
        }
        if (event.type === "removed") return old.filter((o) => o.id !== event.objectId);
        if (event.type === "cleared") return [];
        return old;
      });
      // Once someone's finished stroke lands as a real object, drop its live preview.
      if (event.type === "added" && event.object.type === "stroke") {
        const author = event.object.authorId;
        setLiveStrokes((prev) => {
          if (!prev[author]) return prev;
          const next = { ...prev };
          delete next[author];
          return next;
        });
      }
    });
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- ephemeral stream: cursors + other people's live strokes ------------
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<LiveMsg>(roomId, "whiteboard-live", (msg) => {
      if (msg.userId === myId) return; // ignore our own echo
      const ts = Date.now();
      if (msg.kind === "cursor") {
        setCursors((prev) => ({
          ...prev,
          [msg.userId]: { x: msg.x, y: msg.y, displayName: msg.displayName, color: msg.color, ts },
        }));
      } else {
        setLiveStrokes((prev) => ({
          ...prev,
          [msg.userId]: { points: msg.points, color: msg.color, width: msg.width, ts },
        }));
      }
    });
  }, [roomId, myId]);

  // ----- forget peers who went quiet (tab closed, walked away) --------------
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - STALE_MS;
      setCursors((prev) => prune(prev, cutoff));
      setLiveStrokes((prev) => prune(prev, cutoff));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ----- local pencil sound (this user only) --------------------------------
  // Create the audio once, in the browser. Looping so a long stroke sounds
  // continuous; we pause it the instant the stroke ends (see handleUp).
  useEffect(() => {
    const audio = new Audio("/sounds/draw.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    drawSoundRef.current = audio;
    // If the user mutes mid-stroke, silence the loop right away.
    const offMute = onSfxMutedChange((m) => { if (m) audio.pause(); });
    return () => {
      offMute();
      audio.pause();
      drawSoundRef.current = null;
    };
  }, []);

  // ----- pointer helpers ----------------------------------------------------
  // Normalized {x,y} of the pointer (0..1), or null if it's off-canvas.
  function pointer(): { x: number; y: number } | null {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos || size.w === 0 || size.h === 0) return null;
    return { x: pos.x / size.w, y: pos.y / size.h };
  }

  function handleDown() {
    if (!roomId || !myId) return;
    const p = pointer();
    if (!p) return;

    if (tool === "text") {
      const text = window.prompt("Annotation text:")?.trim();
      if (!text) return;
      commit({
        id: crypto.randomUUID(),
        authorId: myId,
        type: "text",
        x: p.x,
        y: p.y,
        text,
        color: penColor,
        fontSize: DEFAULT_FONT,
      });
      return;
    }

    drawingRef.current = true;
    setLocalStroke([p.x, p.y]);

    // Start the pencil sound for ourselves (others never hear it), unless muted.
    const sound = drawSoundRef.current;
    if (sound && !isSfxMuted()) {
      sound.currentTime = 0;
      void sound.play().catch(() => {});
    }
  }

  function handleMove() {
    if (!roomId || !myId) return;
    const p = pointer();
    if (!p) return;
    const now = Date.now();

    // Broadcast our cursor (throttled) so others can see where we are.
    if (now - lastCursor.current > CURSOR_MS) {
      lastCursor.current = now;
      publishRoom(roomId, "whiteboard-live", {
        kind: "cursor",
        userId: myId,
        displayName: user!.displayName,
        color: myColor,
        x: p.x,
        y: p.y,
      } satisfies LiveMsg);
    }

    if (!drawingRef.current) return;

    // Extend the local stroke and stream a live preview (throttled).
    setLocalStroke((prev) => (prev ? [...prev, p.x, p.y] : [p.x, p.y]));
    if (now - lastDraw.current > DRAW_MS) {
      lastDraw.current = now;
      const pts = [...(localStroke ?? []), p.x, p.y];
      publishRoom(roomId, "whiteboard-live", {
        kind: "draw",
        userId: myId,
        color: penColor,
        width: 4,
        points: pts,
      } satisfies LiveMsg);
    }
  }

  function handleUp() {
    if (!drawingRef.current || !myId) return;
    drawingRef.current = false;
    drawSoundRef.current?.pause(); // stop the local pencil sound
    const pts = localStroke;
    setLocalStroke(null);
    if (!pts || pts.length < 4) return; // a dot/click, not a stroke — discard
    commit({
      id: crypto.randomUUID(),
      authorId: myId,
      type: "stroke",
      color: penColor,
      width: 4,
      points: pts,
    });
  }

  // Optimistically show the new object, then persist it. The server's broadcast
  // will add it for everyone else (and dedupe for us, by id).
  function commit(object: WhiteboardObject) {
    if (!roomId) return;
    queryClient.setQueryData<WhiteboardObject[]>(boardKey, (old = []) => [...old, object]);
    roomWhiteboardApi.add(roomId, object).catch(() => {
      // Roll back if the server rejected it.
      queryClient.setQueryData<WhiteboardObject[]>(boardKey, (old = []) =>
        old.filter((o) => o.id !== object.id)
      );
    });
  }

  function clearBoard() {
    if (!roomId) return;
    queryClient.setQueryData<WhiteboardObject[]>(boardKey, []);
    roomWhiteboardApi.clear(roomId).catch(() => {});
  }

  if (!roomId) {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <p className="font-pixelify text-sm text-ink/60">Join a room to use the whiteboard.</p>
      </div>
    );
  }

  const { w, h } = size;

  return (
    <div ref={containerRef} className="absolute inset-0 bg-white/70">
      {/* Toolbar */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-panel border-[3px] border-panel-stroke px-2 py-1.5 shadow-pixel-sm">
        <button className={`tag ${tool === "pen" ? "active" : ""}`} onClick={() => setTool("pen")}>
          Pen
        </button>
        <button className={`tag ${tool === "text" ? "active" : ""}`} onClick={() => setTool("text")}>
          Text
        </button>
        <span className="mx-1 w-px self-stretch bg-panel-stroke" />
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setPenColor(c)}
            aria-label={`color ${c}`}
            className="h-5 w-5 border-[3px]"
            style={{
              backgroundColor: c,
              borderColor: penColor === c ? "#173E2B" : "#5FB37C",
            }}
          />
        ))}
        <span className="mx-1 w-px self-stretch bg-panel-stroke" />
        <button className="tag" onClick={clearBoard}>
          Clear
        </button>
      </div>

      {w > 0 && h > 0 && (
        <Stage
          ref={stageRef}
          width={w}
          height={h}
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
        >
          {/* Persisted objects */}
          <Layer listening={false}>
            {objects.map((o) =>
              o.type === "stroke" ? (
                <Line
                  key={o.id}
                  points={toPx(o.points, w, h)}
                  stroke={o.color}
                  strokeWidth={o.width}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.3}
                />
              ) : (
                <Text
                  key={o.id}
                  x={o.x * w}
                  y={o.y * h}
                  text={o.text}
                  fill={o.color}
                  fontSize={o.fontSize * h}
                  fontStyle="bold"
                />
              )
            )}
          </Layer>

          {/* In-progress strokes: mine + everyone else's live previews */}
          <Layer listening={false}>
            {localStroke && (
              <Line
                points={toPx(localStroke, w, h)}
                stroke={penColor}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
              />
            )}
            {Object.entries(liveStrokes).map(([uid, s]) => (
              <Line
                key={uid}
                points={toPx(s.points, w, h)}
                stroke={s.color}
                strokeWidth={s.width}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
              />
            ))}
          </Layer>

          {/* Live cursors (who's who) */}
          <Layer listening={false}>
            {Object.entries(cursors).map(([uid, c]) => (
              <CursorMarker key={uid} x={c.x * w} y={c.y * h} color={c.color} name={c.displayName} />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

// A peer's pointer: a colored dot plus their name on a matching pill.
function CursorMarker({ x, y, color, name }: { x: number; y: number; color: string; name: string }) {
  return (
    <>
      <Circle x={x} y={y} radius={5} fill={color} stroke="#ffffff" strokeWidth={1.5} />
      <Text
        x={x + 8}
        y={y + 6}
        text={name}
        fontSize={13}
        fontStyle="bold"
        fill="#ffffff"
        padding={2}
        // a faint dark backdrop so light names stay readable on a white board
        shadowColor={color}
        shadowBlur={0}
        shadowOffset={{ x: 1, y: 1 }}
      />
    </>
  );
}

// flat [x,y,...] of 0..1 fractions -> pixels for the current canvas size.
function toPx(points: number[], w: number, h: number): number[] {
  return points.map((v, i) => (i % 2 === 0 ? v * w : v * h));
}

// Drop entries whose last update is older than `cutoff`.
function prune<T extends { ts: number }>(map: Record<string, T>, cutoff: number): Record<string, T> {
  let changed = false;
  const next: Record<string, T> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v.ts >= cutoff) next[k] = v;
    else changed = true;
  }
  return changed ? next : map;
}
