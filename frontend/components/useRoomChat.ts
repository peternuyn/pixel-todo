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

/**
 * All the DATA for one room's chat, kept out of the view. Same recipe as RoomTodo:
 *   1. useQuery fetches the message history once.
 *   2. subscribeRoom listens on /topic/rooms/{roomId}/chat and applies live deltas
 *      straight to the TanStack Query cache — no refetch round-trips.
 *   3. useMutation sends messages / asks the AI / toggles reactions; the server's
 *      broadcast is what actually updates the UI (for us and everyone else).
 *
 * Returns the messages plus the three mutations and a shared `error` string. The view
 * owns purely-visual state (draft, AI mode, which reaction palette is open, scroll).
 */
export function useRoomChat(roomId: string | null) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Message ids that arrived LIVE over the WebSocket during this session. The view uses
  // this to typewriter-animate ONLY fresh AI answers; history renders instantly.
  const liveArrivedRef = useRef<Set<string>>(new Set());

  // Cache key includes roomId so each room keeps its own message list.
  const messagesKey = ["roomMessages", roomId] as const;

  const { data: messages = [], isLoading } = useQuery({
    queryKey: messagesKey,
    queryFn: () => roomMessageApi.list(roomId!),
    enabled: !!roomId,
  });

  // Live updates: "created" appends a message; "reaction" swaps in the fresh reaction map.
  useEffect(() => {
    if (!roomId) return;
    return subscribeRoom<ChatEvent>(roomId, "chat", (event) => {
      queryClient.setQueryData<ChatMessageResponse[]>(messagesKey, (old = []) => {
        if (event.type === "created") {
          // Guard against the rare duplicate (e.g. a reconnect replay).
          if (old.some((m) => m.messageId === event.message.messageId)) return old;
          // Remember it arrived live so an AI answer types out.
          liveArrivedRef.current.add(event.message.messageId);
          return [...old, event.message];
        }
        if (event.type === "reaction") {
          return old.map((m) =>
            m.messageId === event.messageId ? { ...m, reactions: event.reactions } : m
          );
        }
        return old;
      });
    });
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const showError = (err: unknown, fallback: string) =>
    setError(err instanceof ApiError ? err.message : fallback);

  // Each mutation reads the current user at call time. The server broadcast (not these
  // callbacks) is what inserts the message, so on success we only clear any error.
  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      roomMessageApi.send(roomId!, getStoredUser()!.userId, content),
    onSuccess: () => setError(null),
    onError: (err) => showError(err, "Failed to send message"),
  });

  const askAi = useMutation({
    mutationFn: (prompt: string) =>
      roomMessageApi.askAi(roomId!, getStoredUser()!.userId, prompt),
    onSuccess: () => setError(null),
    onError: (err) => showError(err, "The AI assistant failed to respond"),
  });

  const toggleReaction = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      roomMessageApi.toggleReaction(roomId!, messageId, getStoredUser()!.userId, emoji),
    onError: (err) => showError(err, "Failed to react"),
  });

  return {
    messages,
    isLoading,
    error,
    setError,
    liveArrivedRef,
    sendMessage,
    askAi,
    toggleReaction,
  };
}
