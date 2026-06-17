"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  roomMessageApi,
  ChatMessageResponse,
  ChatEvent,
  getStoredUser,
  ApiError,
} from "@/lib/api";
import { subscribeRoom } from "@/lib/ws";
import MessageContent from "./MessageContent";

// The SHARED, real-time chat for one room. Same recipe as RoomTodo:
//   1. useQuery fetches the message history once.
//   2. subscribeRoom listens on /topic/rooms/{roomId}/chat and applies live
//      deltas straight to the TanStack Query cache — no refetch round-trips.
//   3. useMutation sends messages / toggles reactions; the server's broadcast is
//      what actually updates the UI (for us and everyone else).
const REACTION_CHOICES = ["👍", "❤️", "😂", "🎉", "✅"];

export default function Chat({ roomId }: { roomId: string | null }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Which message currently has its emoji palette open (null = none).
  const [paletteFor, setPaletteFor] = useState<string | null>(null);

  const user = getStoredUser();

  // Cache key includes roomId so each room keeps its own message list.
  const messagesKey = ["roomMessages", roomId] as const;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: messagesKey,
    queryFn: () => roomMessageApi.list(roomId!),
    enabled: !!roomId,
  });

  // Live updates: a "created" event appends a message; a "reaction" event swaps in
  // the fresh reaction map for one message.
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<ChatEvent>(roomId, "chat", (event) => {
      queryClient.setQueryData<ChatMessageResponse[]>(messagesKey, (old = []) => {
        if (event.type === "created") {
          // Guard against the rare duplicate (e.g. a reconnect replay).
          if (old.some((m) => m.messageId === event.message.messageId)) return old;
          return [...old, event.message];
        }
        if (event.type === "reaction") {
          return old.map((m) =>
            m.messageId === event.messageId
              ? { ...m, reactions: event.reactions }
              : m
          );
        }
        return old;
      });
    });
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the view pinned to the newest message as the list grows.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const showError = (err: unknown, fallback: string) =>
    setError(err instanceof ApiError ? err.message : fallback);

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      roomMessageApi.send(roomId!, user!.userId, content),
    onSuccess: () => {
      setDraft("");
      setError(null);
      // No manual insert — the broadcast above adds the message for everyone.
    },
    onError: (err) => showError(err, "Failed to send message"),
  });

  const toggleReaction = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      roomMessageApi.toggleReaction(roomId!, messageId, user!.userId, emoji),
    onError: (err) => showError(err, "Failed to react"),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    if (!user) {
      setError("You must be logged in to chat");
      return;
    }
    sendMessage.mutate(content);
  }

  function react(messageId: string, emoji: string) {
    setPaletteFor(null);
    if (!user) {
      setError("You must be logged in to react");
      return;
    }
    toggleReaction.mutate({ messageId, emoji });
  }

  // No room in the URL — nothing to show.
  if (!roomId) {
    return (
      <section className="w-full p-5 rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel">
        <ChatHeader />
        <p className="mt-2 font-pixelify text-sm text-ink/50">
          Join a room to chat with everyone in it.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full p-5 pb-4 rounded-3xl border-4 border-panel-stroke bg-panel shadow-pixel">
      <ChatHeader count={messages.length} />

      {error && <p className="font-press text-[8px] text-barn mt-2 mb-1">{error}</p>}

      <div
        ref={listRef}
        className="scroll-leaf mt-3 flex flex-col gap-2.5 h-72 overflow-y-auto pr-1"
      >
        {isLoading ? (
          <p className="font-pixelify text-sm text-ink/50">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-ink/45">
            <span className="text-3xl">🌾</span>
            <p className="mt-1 font-pixelify text-sm">No messages yet — say hi!</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = user?.userId === m.userId;
            const reactionEmojis = Object.keys(m.reactions);
            return (
              <div
                key={m.messageId}
                className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                {!mine && <Avatar name={m.displayName} url={m.avatarUrl} />}

                <div
                  className={`flex min-w-0 max-w-[82%] flex-col ${
                    mine ? "items-end" : "items-start"
                  }`}
                >
                  {/* Sender + time. For your own messages we say "You". */}
                  <div
                    className={`flex items-baseline gap-1.5 px-0.5 ${
                      mine ? "flex-row-reverse" : ""
                    }`}
                  >
                    <span className="font-press text-[8px] text-wood-dark">
                      {mine ? "You" : m.displayName}
                    </span>
                    <span className="font-pixelify text-[11px] text-ink/40">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* The message bubble — tinted butter for you, white for others. */}
                  <div
                    className={`mt-0.5 border-[2px] border-panel-stroke px-2.5 py-1.5 font-pixelify text-base leading-snug text-ink shadow-pixel-sm break-words ${
                      mine ? "bg-sun/60" : "bg-white"
                    }`}
                  >
                    <MessageContent content={m.content} />
                  </div>

                  {/* Reactions: existing chips always show; the add-reaction
                      control stays muted until you hover/focus the message. */}
                  <div
                    className={`mt-1 flex flex-wrap items-center gap-1 ${
                      mine ? "justify-end" : ""
                    }`}
                  >
                    {reactionEmojis.map((emoji) => {
                      const userIds = m.reactions[emoji];
                      const reactedByMe = !!user && userIds.includes(user.userId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => react(m.messageId, emoji)}
                          title={`${userIds.length} reacted`}
                          className={`px-1.5 py-0.5 text-xs border-[2px] border-panel-stroke rounded-full leading-none ${
                            reactedByMe ? "bg-sun" : "bg-white"
                          }`}
                        >
                          {emoji} {userIds.length}
                        </button>
                      );
                    })}

                    {paletteFor === m.messageId ? (
                      <div className="flex items-center gap-1 border-[2px] border-panel-stroke bg-white px-1.5 py-0.5 shadow-pixel-sm">
                        {REACTION_CHOICES.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => react(m.messageId, emoji)}
                            className="text-base leading-none transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => setPaletteFor(m.messageId)}
                        aria-label="Add reaction"
                        className="px-1 text-sm leading-none text-ink/30 opacity-100 transition-opacity hover:text-ink group-hover:opacity-100 sm:opacity-0 sm:focus:opacity-100"
                      >
                        🙂＋
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sendMessage.isPending}
          placeholder="Message… (paste an image URL or link)"
          className="flex-1 font-pixelify text-base bg-white border-[3px] border-panel-stroke px-2 py-1.5 outline-none text-ink focus:bg-[#F4FBF5] disabled:opacity-50"
        />
        <button type="submit" disabled={sendMessage.isPending} className="tag disabled:opacity-50">
          Send
        </button>
      </form>
    </section>
  );
}

// Shared card header so the empty/no-room/active states all look identical.
function ChatHeader({ count }: { count?: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-press text-[11px] flex items-center gap-2.5">
        <span>💬</span>
        <span>Chat</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="font-silk text-[10px] uppercase tracking-widest text-wood-dark">
          {count} {count === 1 ? "msg" : "msgs"}
        </span>
      )}
    </div>
  );
}

// A small pixel avatar: the sender's picture if they have one, otherwise a square
// chip with their first initial. Squared (not round) to match the pixel theme.
function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="mt-4 h-7 w-7 shrink-0 border-[2px] border-panel-stroke object-cover"
      />
    );
  }
  return (
    <div className="mt-4 grid h-7 w-7 shrink-0 place-items-center border-[2px] border-panel-stroke bg-wood-light font-press text-[9px] text-ink">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
