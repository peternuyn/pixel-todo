"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredUser } from "@/lib/api";
import { playSfx } from "@/lib/sfx";
import TodoRow from "./TodoRow";

type Item = { id: number; label: string; done: boolean };

// Where we keep the list in the browser. We scope it to the logged-in user's id
// so two people sharing a browser get separate private lists. ("guest" covers
// the not-logged-in case.) It is deliberately NOT tied to a room, so it follows
// the user as they move between rooms.
function storageKey(): string {
  return `personal-todos:${getStoredUser()?.userId ?? "guest"}`;
}

// The PERSONAL to-do list. It never touches the backend — it lives entirely in
// the browser's localStorage. That's why it persists across rooms and refreshes
// on this device, but won't appear on a different device/browser.
export default function PersonalTodo() {
  const [todos, setTodos] = useState<Item[]>([]);
  const [draft, setDraft] = useState("");
  // localStorage only exists in the browser, not during Next.js's server render.
  // We load it AFTER mount and gate rendering on `mounted` to avoid a hydration
  // mismatch (server HTML must match the first client render).
  const [mounted, setMounted] = useState(false);

  // Load the saved list once, on mount.
  useEffect(() => {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      try {
        setTodos(JSON.parse(raw) as Item[]);
      } catch {
        // Corrupted/old data — just start empty.
      }
    }
    setMounted(true);
  }, []);

  // Persist whenever the list changes (but only after the initial load, so we
  // don't overwrite the saved list with the empty starting state).
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(storageKey(), JSON.stringify(todos));
    }
  }, [todos, mounted]);

  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  function toggle(id: number) {
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: number) {
    setTodos((ts) => ts.filter((t) => t.id !== id));
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    playSfx("confirm");
    setTodos((ts) => [...ts, { id: Date.now(), label, done: false }]);
    setDraft("");
  }

  return (
    <>
      <div className="mb-3 flex items-center font-press text-[11px]">
        <span className="ml-auto font-silk text-[10px] text-wood-dark">
          {remaining} LEFT
        </span>
      </div>

      {!mounted ? (
        <p className="font-pixelify text-sm text-ink/50">Loading…</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {todos.length === 0 ? (
              <li className="font-pixelify text-sm text-ink/50">No tasks yet.</li>
            ) : (
              todos.map((t) => (
                <TodoRow
                  key={t.id}
                  label={t.label}
                  done={t.done}
                  onToggle={() => toggle(t.id)}
                  onRemove={() => remove(t.id)}
                />
              ))
            )}
          </ul>

          <form onSubmit={add} className="mt-3 flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Plant a new task..."
              className="flex-1 font-pixelify text-base bg-white border-[3px] border-panel-stroke px-2 py-1.5 outline-none text-ink focus:bg-[#F4FBF5]"
            />
            <button type="submit" data-sfx="off" className="tag">
              Add
            </button>
          </form>
        </>
      )}
    </>
  );
}
