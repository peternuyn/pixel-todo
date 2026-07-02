import type { ChatMessageResponse } from "@/lib/api";
import type { ChatUser } from "./chatItems";
import MessageContent from "./MessageContent";
import ReactionRow from "./ReactionRow";

// A single human chat message: avatar (for others) + sender/time + bubble + reactions.
// Your own messages are right-aligned and butter-tinted; everyone else's sit left in white.
export default function ChatMessage({
  message,
  user,
  react,
  paletteFor,
  setPaletteFor,
}: {
  message: ChatMessageResponse;
  user: ChatUser;
  react: (messageId: string, emoji: string) => void;
  paletteFor: string | null;
  setPaletteFor: (id: string | null) => void;
}) {
  const mine = user?.userId === message.userId;
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      {!mine && <Avatar name={message.displayName} url={message.avatarUrl} />}

      <div className={`flex min-w-0 max-w-[82%] flex-col ${mine ? "items-end" : "items-start"}`}>
        {/* Sender + time. For your own messages we say "You". */}
        <div className={`flex items-baseline gap-1.5 px-0.5 ${mine ? "flex-row-reverse" : ""}`}>
          <span className="font-press text-[8px] text-wood-dark">
            {mine ? "You" : message.displayName}
          </span>
          <span className="font-pixelify text-[11px] text-ink/40">{time}</span>
        </div>

        {/* The message bubble — tinted butter for you, white for others. */}
        <div
          className={`mt-0.5 border-[2px] border-panel-stroke px-2.5 py-1.5 font-pixelify text-base leading-snug text-ink shadow-pixel-sm break-words ${
            mine ? "bg-sun/60" : "bg-white"
          }`}
        >
          <MessageContent content={message.content} />
        </div>

        <ReactionRow
          message={message}
          user={user}
          align={mine ? "end" : "start"}
          react={react}
          paletteFor={paletteFor}
          setPaletteFor={setPaletteFor}
        />
      </div>
    </div>
  );
}

// A small pixel avatar: the sender's picture if they have one, otherwise a square chip
// with their first initial. Squared (not round) to match the pixel theme.
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
