"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import catGif from "@/assets/gifs/meo-di-ve-phia-truoc-loop.gif";
import theme from "@/assets/theme-room1.svg";
import Pet from "./Pet";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function FarmScene() {
  const [zoom, setZoom] = useState(1.3);
  const [pan, setPan] = useState({ x: 0, y: 0 });

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

  const cursor =
    zoom <= MIN_ZOOM ? "default" : dragging ? "grabbing" : "grab";

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
            src={theme}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 900px) 80vw, 50vw"
            className="object-contain [image-rendering:pixelated] pointer-events-none"
          />

          {/* Pets — positioned relative to the hills tile */}
          <Pet
            src={catGif}
            name="Mai Linh"
            className="top-[44%] left-[55%] -translate-x-1/2 -translate-y-1/2 w-[18%]"
          />
        </div>
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
