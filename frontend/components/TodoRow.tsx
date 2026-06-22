"use client";

import { playSfx } from "@/lib/sfx";

// A single to-do line: a pixel checkbox + the label, with an optional ✕ delete
// button that fades in on hover. Both the Room and Personal lists render this,
// so the look stays identical between the two tabs.
//
// It's "presentational": it holds no state and knows nothing about where the
// data lives (backend vs localStorage). The parent passes the current values
// and the callbacks to run when the user clicks.
export default function TodoRow({
  label,
  done,
  onToggle,
  onRemove,
  disabled = false,
}: {
  label: string;
  done: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <li
      onClick={
        disabled
          ? undefined
          : () => {
              // Ticking a task DONE is a satisfying "confirm"; un-ticking is lighter.
              playSfx(done ? "select" : "confirm");
              onToggle();
            }
      }
      className={`group flex items-center gap-2.5 font-pixelify text-lg select-none ${
        disabled ? "opacity-50" : "cursor-pointer"
      }`}
    >
      <span
        className={`relative w-[18px] h-[18px] flex-shrink-0 border-[3px] border-panel-stroke ${
          done ? "bg-grass" : "bg-white"
        }`}
      >
        {done && (
          <span className="absolute left-[2px] top-0 w-[5px] h-[9px] border-solid border-ink border-r-[3px] border-b-[3px] rotate-45" />
        )}
      </span>

      <span
        className={`flex-1 ${done ? "line-through text-wood-dark opacity-60" : ""}`}
      >
        {label}
      </span>

      {onRemove && (
        <button
          type="button"
          aria-label="Delete task"
          data-sfx="off"
          onClick={(e) => {
            // Stop the click from also toggling the row.
            e.stopPropagation();
            playSfx("cancel");
            onRemove();
          }}
          disabled={disabled}
          className="text-ink/30 hover:text-barn opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      )}
    </li>
  );
}
