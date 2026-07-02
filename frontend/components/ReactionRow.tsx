import type { ChatMessageResponse } from "@/lib/api";
import type { ChatUser } from "./chatItems";

const REACTION_CHOICES = ["👍", "❤️", "😂", "🎉", "✅"];

// The reactions row shared by human bubbles and the Gemini card: existing emoji chips
// (with counts, your own highlighted) plus an add-reaction control that stays muted
// until you hover or focus the message.
export default function ReactionRow({
  message,
  user,
  align,
  react,
  paletteFor,
  setPaletteFor,
}: {
  message: ChatMessageResponse;
  user: ChatUser;
  align: "start" | "end";
  react: (messageId: string, emoji: string) => void;
  paletteFor: string | null;
  setPaletteFor: (id: string | null) => void;
}) {
  const emojis = Object.keys(message.reactions);
  return (
    <div
      className={`mt-1 flex flex-wrap items-center gap-1 ${
        align === "end" ? "justify-end" : ""
      }`}
    >
      {emojis.map((emoji) => {
        const userIds = message.reactions[emoji];
        const reactedByMe = !!user && userIds.includes(user.userId);
        return (
          <button
            key={emoji}
            onClick={() => react(message.messageId, emoji)}
            title={`${userIds.length} reacted`}
            className={`px-1.5 py-0.5 text-xs border-[2px] border-panel-stroke rounded-full leading-none ${
              reactedByMe ? "bg-sun" : "bg-white"
            }`}
          >
            {emoji} {userIds.length}
          </button>
        );
      })}

      {paletteFor === message.messageId ? (
        <div className="flex items-center gap-1 border-[2px] border-panel-stroke bg-white px-1.5 py-0.5 shadow-pixel-sm">
          {REACTION_CHOICES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => react(message.messageId, emoji)}
              className="text-base leading-none transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setPaletteFor(message.messageId)}
          aria-label="Add reaction"
          className="px-1 text-sm leading-none text-ink/30 opacity-100 transition-opacity hover:text-ink group-hover:opacity-100 sm:opacity-0 sm:focus:opacity-100"
        >
          🙂＋
        </button>
      )}
    </div>
  );
}
