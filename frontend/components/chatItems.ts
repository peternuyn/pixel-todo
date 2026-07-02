import type { ChatMessageResponse } from "@/lib/api";

// The current viewer, as far as the chat UI cares: just enough to know "is this mine?"
// and "did I react?". `getStoredUser()` returns a superset of this.
export type ChatUser = { userId: string } | null | undefined;

// One row in the rendered chat: either a normal message, or a Gemini answer paired
// with the question that prompted it (question may be null if it can't be found).
export type ChatItem =
  | { kind: "msg"; msg: ChatMessageResponse }
  | { kind: "ai"; question: ChatMessageResponse | null; answer: ChatMessageResponse };

/**
 * Group the flat message list into render items. A Gemini answer ABSORBS the human
 * question that comes right before it, so the pair renders as ONE "Gemini answer" card
 * (and the question isn't also drawn on its own line). The backend timestamps the answer
 * just after its question, so they stay adjacent even after a reload.
 */
export function pairMessages(messages: ChatMessageResponse[]): ChatItem[] {
  const items: ChatItem[] = [];
  for (const m of messages) {
    const last = items[items.length - 1];
    if (m.isAi && last?.kind === "msg" && !last.msg.isAi && last.msg.userId) {
      items[items.length - 1] = { kind: "ai", question: last.msg, answer: m };
    } else if (m.isAi) {
      items.push({ kind: "ai", question: null, answer: m });
    } else {
      items.push({ kind: "msg", msg: m });
    }
  }
  return items;
}
