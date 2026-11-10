import type { ChatMessageResponse } from "@/lib/api";
import type { ChatUser } from "./chatItems";

const REACTION_CHOICES = ["👍", "❤️", "😂", "🎉", "✅"];

// Shared "pixel press": on click the chip nudges into its own shadow, like a
// physical button. Calm and tactile — no hover jitter.
const PIXEL_PRESS =
  "transition-colors active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

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
  const paletteOpen = paletteFor === message.messageId;

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
            className={`flex items-center gap-1 rounded-full border-[2px] border-panel-stroke px-2 py-0.5 leading-none shadow-pixel-sm ${PIXEL_PRESS} ${
              reactedByMe ? "bg-sun hover:bg-sun-deep" : "bg-white hover:bg-panel"
            }`}
          >
            <span className="text-xs">{emoji}</span>
            <span className="font-press text-[8px] text-ink">{userIds.length}</span>
          </button>
        );
      })}

      {paletteOpen ? (
        <div className="flex items-center gap-0.5 rounded-full border-[2px] border-panel-stroke bg-white px-1 py-0.5 shadow-pixel-sm">
          {REACTION_CHOICES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => react(message.messageId, emoji)}
              className="grid h-6 w-6 place-items-center rounded-full text-base leading-none transition-colors hover:bg-sun"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setPaletteFor(null)}
            aria-label="Close reactions"
            className="grid h-6 w-6 place-items-center rounded-full font-press text-[9px] text-ink/70 transition-colors hover:bg-panel hover:text-ink"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPaletteFor(message.messageId)}
          aria-label="Add reaction"
          className={`flex items-center gap-0.5 rounded-full border-[2px] border-panel-stroke bg-white px-2 py-0.5 text-xs leading-none text-ink/70 shadow-pixel-sm ${PIXEL_PRESS} hover:text-ink group-hover:opacity-100 sm:opacity-0 sm:focus:opacity-100`}
        >
          <span>🙂</span>
          <span className="font-press text-[8px]">＋</span>
        </button>
      )}
    </div>
  );
}
