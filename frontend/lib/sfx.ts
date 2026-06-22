// Tiny sound-effect helper for the cozy pixel UI. Plays the short WAVs that live in
// /public/sounds (served at the URLs below).
//
// WHY A HELPER (instead of `new Audio(...)` everywhere)? It keeps every sound in one
// place — easy to retune volume, swap a file, or MUTE globally — and handles the two
// browser quirks for us:
//   1. SSR: there's no `window`/`Audio` on the server, so we no-op there.
//   2. Autoplay policy: play() rejects if the user hasn't interacted with the page
//      yet. Sounds are non-essential polish, so we just swallow that.
//
// A fresh Audio per call means rapid/overlapping effects (e.g. ticking several tasks
// quickly) stack instead of cutting each other off.

const SOUNDS = {
  select: "/sounds/select.wav", // light UI move: tabs, toggles, menu items, presets
  confirm: "/sounds/confirm.wav", // a positive commit: submit, add a task, start clock
  cancel: "/sounds/cancel.wav", // dismiss / back: close a modal, reset, delete
  badge: "/sounds/unlock-new-award.wav", // earning a badge (the celebratory one)
} as const;

export type Sfx = keyof typeof SOUNDS;

// Per-effect volume so none of them are jarring (the celebratory one is loudest).
const VOLUME: Record<Sfx, number> = {
  select: 0.35,
  confirm: 0.5,
  cancel: 0.45,
  badge: 0.6,
};

// ---------------------------------------------------------------------------
// Global mute. One flag for ALL sound effects (these one-shots AND the
// whiteboard pencil loop, which checks isSfxMuted() itself). We remember the
// choice in localStorage so it survives reloads, and let interested components
// (the toggle button, the whiteboard) subscribe to changes.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "sfx-muted";

// Read the saved preference once, on the client. Defaults to "not muted".
let muted =
  typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";

const listeners = new Set<(muted: boolean) => void>();

export function isSfxMuted(): boolean {
  return muted;
}

export function setSfxMuted(value: boolean): void {
  muted = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(value));
  }
  listeners.forEach((fn) => fn(muted));
}

/** Flip mute on/off; returns the new muted state. */
export function toggleSfxMuted(): boolean {
  setSfxMuted(!muted);
  return muted;
}

/** Subscribe to mute changes; returns an unsubscribe function. */
export function onSfxMutedChange(fn: (muted: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Play one of the named UI sounds. Safe to call anywhere (no-ops if muted/SSR). */
export function playSfx(name: Sfx): void {
  if (muted || typeof window === "undefined") return;
  try {
    const audio = new Audio(SOUNDS[name]);
    audio.volume = VOLUME[name];
    void audio.play().catch(() => {});
  } catch {
    // Audio unavailable — ignore; the UI works fine without sound.
  }
}
