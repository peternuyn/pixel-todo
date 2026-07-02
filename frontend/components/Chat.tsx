"use client";

import { useEffect, useRef, useState } from "react";
import { getStoredUser } from "@/lib/api";
import AiAnswerCard, { AiThinking } from "./AiAnswerCard";
import ChatComposer from "./ChatComposer";
import ChatMessage from "./ChatMessage";
import ReactionRow from "./ReactionRow";
import { pairMessages } from "./chatItems";
import { useRoomChat } from "./useRoomChat";

// The SHARED, real-time chat for one room. This component is just the composition:
// the data lives in useRoomChat, each row is a ChatMessage or an AiAnswerCard, and the
// input lives in ChatComposer. Here we only wire them together and own the view-only
// bits (which reaction palette is open, and keeping the list scrolled to the bottom).
export default function Chat({ roomId }: { roomId: string | null }) {
  const { messages, isLoading, error, setError, liveArrivedRef, sendMessage, askAi, toggleReaction } =
    useRoomChat(roomId);

  // Which message currently has its emoji palette open (null = none).
  const [paletteFor, setPaletteFor] = useState<string | null>(null);
  const user = getStoredUser();
  const items = pairMessages(messages);

  // Keep the view pinned to the newest message as the list grows / while Gemini thinks.
  const listRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useEffect(scrollToBottom, [messages.length]);
  useEffect(scrollToBottom, [askAi.isPending]);

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
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-ink/45">
            <span className="text-3xl">🌾</span>
            <p className="mt-1 font-pixelify text-sm">No messages yet — say hi!</p>
          </div>
        ) : (
          items.map((item) => {
            // A Gemini answer: a calm, distinct card carrying its question as context.
            if (item.kind === "ai") {
              const { question, answer } = item;
              const time = new Date(answer.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <AiAnswerCard
                  key={answer.messageId}
                  question={question?.content ?? null}
                  answer={answer.content}
                  time={time}
                  animate={liveArrivedRef.current.has(answer.messageId)}
                  onProgress={scrollToBottom}
                  footer={
                    <ReactionRow
                      message={answer}
                      user={user}
                      align="start"
                      react={react}
                      paletteFor={paletteFor}
                      setPaletteFor={setPaletteFor}
                    />
                  }
                />
              );
            }

            // A normal human message.
            return (
              <ChatMessage
                key={item.msg.messageId}
                message={item.msg}
                user={user}
                react={react}
                paletteFor={paletteFor}
                setPaletteFor={setPaletteFor}
              />
            );
          })
        )}

        {/* While Gemini works, show a calm "thinking" card to whoever asked. */}
        {askAi.isPending && <AiThinking />}
      </div>

      <ChatComposer
        busy={sendMessage.isPending || askAi.isPending}
        loggedIn={!!user}
        onSendMessage={(content) => sendMessage.mutateAsync(content)}
        onAskAi={(prompt) => askAi.mutateAsync(prompt)}
        onError={setError}
      />
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
