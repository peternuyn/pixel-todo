"use client";

import { useEffect, useRef, useState } from "react";
import type { Room } from "@/lib/rooms";

type Props = {
  room: Room;
  onConfirm: (password: string) => void;
  onClose: () => void;
};

export default function PasswordModal({ room, onConfirm, onClose }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError(true);
      return;
    }
    onConfirm(value.trim());
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/50"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pw-modal-title"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm panel shadow-pixel-lg"
      >
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <h2
              id="pw-modal-title"
              className="font-jersey text-2xl leading-none text-ink"
            >
              {room.name}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-[3px] border-panel-stroke bg-wood-light font-press text-[10px] active:translate-y-[2px]"
          >
            ✕
          </button>
        </div>

        <p className="font-pixelify text-sm text-ink/60 mb-4">
          This room is private. Enter the password to join.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="room-password"
              className="font-press text-[8px] uppercase tracking-widest text-ink/70"
            >
              Password
            </label>
            <input
              ref={inputRef}
              id="room-password"
              type="password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
              className={`w-full bg-panel border-[3px] px-3 py-2 font-pixelify text-ink outline-none placeholder:text-ink/30 ${
                error
                  ? "border-barn"
                  : "border-panel-stroke focus:border-grass-dark"
              }`}
            />
            {error && (
              <p className="font-press text-[8px] text-barn">
                Please enter a password.
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-1">
            <button
              type="button"
              onClick={onClose}
              className="tag"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tag active bg-sun hover:bg-sun-deep"
            >
              Enter Room →
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
