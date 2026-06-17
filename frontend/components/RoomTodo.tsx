"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roomTaskApi, RoomTaskResponse, TaskEvent, getStoredUser, ApiError } from "@/lib/api";
import { subscribeRoom } from "@/lib/ws";
import TodoRow from "./TodoRow";

// The SHARED to-do list for one room. It's backed by the API, so every member
// sees the same list. We use TanStack Query: useQuery to read the list, and
// useMutation to add/tick/delete. After each change we "invalidate" the cached
// list so it refetches and shows the latest server truth.
export default function RoomTodo({ roomId }: { roomId: string | null }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The logged-in user (saved at login). We need their id to create tasks.
  const user = getStoredUser();

  // The cache key includes roomId, so each room keeps its own cached list and
  // switching rooms shows the right tasks.
  const tasksKey = ["roomTasks", roomId] as const;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: tasksKey,
    queryFn: () => roomTaskApi.list(roomId!),
    enabled: !!roomId, // don't fetch until we actually have a room
  });

  // Live updates: subscribe to /topic/rooms/{roomId}/tasks. The server broadcasts
  // a TaskEvent after every create/toggle/delete, so we apply the delta directly
  // to the TanStack Query cache — no refetch round-trip needed.
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<TaskEvent>(roomId, "tasks", (event) => {
      queryClient.setQueryData<RoomTaskResponse[]>(tasksKey, (old = []) => {
        if (event.type === "created") return [...old, event.task];
        if (event.type === "updated") return old.map((t) => t.taskId === event.task.taskId ? event.task : t);
        if (event.type === "deleted") return old.filter((t) => t.taskId !== event.taskId);
        return old;
      });
    });
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showError = (err: unknown, fallback: string) =>
    setError(err instanceof ApiError ? err.message : fallback);

  const addTask = useMutation({
    mutationFn: (title: string) => roomTaskApi.create(roomId!, user!.userId, title),
    onSuccess: () => {
      setDraft("");
      setError(null);
      // No invalidateQueries — the broadcast from the server will update the cache
      // for everyone (including this user) via the subscription above.
    },
    onError: (err) => showError(err, "Failed to add task"),
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      roomTaskApi.toggle(roomId!, taskId, completed),
    onError: (err) => showError(err, "Failed to update task"),
  });

  const removeTask = useMutation({
    mutationFn: (taskId: string) => roomTaskApi.remove(roomId!, taskId),
    onError: (err) => showError(err, "Failed to delete task"),
  });

  const remaining = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    if (!user) {
      setError("You must be logged in to add tasks");
      return;
    }
    addTask.mutate(title);
  }

  // No room in the URL — nothing to show.
  if (!roomId) {
    return (
      <p className="font-pixelify text-sm text-ink/50">
        Join a room to see its shared to-do list.
      </p>
    );
  }

  const busy = addTask.isPending || isLoading;

  return (
    <>
      <div className="mb-3 flex items-center font-press text-[11px]">
        <span className="ml-auto font-silk text-[10px] text-wood-dark">
          {remaining} LEFT
        </span>
      </div>

      {error && (
        <p className="font-press text-[8px] text-barn mb-3">{error}</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {isLoading ? (
          <li className="font-pixelify text-sm text-ink/50">Loading…</li>
        ) : tasks.length === 0 ? (
          <li className="font-pixelify text-sm text-ink/50">No tasks yet.</li>
        ) : (
          tasks.map((t) => (
            <TodoRow
              key={t.taskId}
              label={t.title}
              done={t.completed}
              onToggle={() =>
                toggleTask.mutate({ taskId: t.taskId, completed: !t.completed })
              }
              onRemove={() => removeTask.mutate(t.taskId)}
            />
          ))
        )}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          placeholder="Add a shared task..."
          className="flex-1 font-pixelify text-base bg-white border-[3px] border-panel-stroke px-2 py-1.5 outline-none text-ink focus:bg-[#F4FBF5] disabled:opacity-50"
        />
        <button type="submit" disabled={busy} className="tag disabled:opacity-50">
          Add
        </button>
      </form>
    </>
  );
}
