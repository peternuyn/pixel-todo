"use client";

import { useMemo, useState } from "react";

type Item = { id: number; label: string; done: boolean };

const DEFAULT_TODOS: Item[] = [
  { id: 1, label: "Read chapter 4", done: false },
  { id: 2, label: "Outline essay", done: true },
  { id: 3, label: "Solve problem set", done: false },
];

export default function Todo({ initial = DEFAULT_TODOS }: { initial?: Item[] }) {
  const [todos, setTodos] = useState<Item[]>(initial);
  const [draft, setDraft] = useState("");

  const remaining = useMemo(
    () => todos.filter((t) => !t.done).length,
    [todos]
  );

  function toggle(id: number) {
    setTodos((ts) =>
      ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    setTodos((ts) => [...ts, { id: Date.now(), label, done: false }]);
    setDraft("");
  }

  return (
    <section
      className="relative w-full p-5 pb-6 rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel flex flex-col justify-center"
    >
      <div className="font-press text-[11px] flex items-center gap-2.5 mb-3">
        <span>📝</span>
        <span>To-do</span>
        <span className="ml-auto font-silk text-[10px] text-wood-dark">
          {remaining} LEFT
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {todos.map((t) => (
          <TodoRow key={t.id} item={t} onToggle={() => toggle(t.id)} />
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Plant a new task..."
          className="flex-1 font-pixelify text-base bg-white border-[3px] border-panel-stroke px-2 py-1.5 outline-none text-ink focus:bg-[#F4FBF5]"
        />
        <button type="submit" className="tag">
          Add
        </button>
      </form>
    </section>
  );
}

function TodoRow({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <li
      onClick={onToggle}
      className="flex items-center gap-2.5 font-pixelify text-lg cursor-pointer select-none"
    >
      <span
        className={`relative w-[18px] h-[18px] flex-shrink-0 border-[3px] border-panel-stroke ${
          item.done ? "bg-grass" : "bg-white"
        }`}
      >
        {item.done && (
          <span className="absolute left-[2px] top-0 w-[5px] h-[9px] border-solid border-ink border-r-[3px] border-b-[3px] rotate-45" />
        )}
      </span>
      <span
        className={item.done ? "line-through text-wood-dark opacity-60" : ""}
      >
        {item.label}
      </span>
    </li>
  );
}
