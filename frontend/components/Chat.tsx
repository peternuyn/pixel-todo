type Props = {
  unread?: number;
  preview?: { from: string; text: string };
};

export default function Chat({
  unread = 3,
  preview = { from: "Whiskers", text: "good luck today! 🌾" },
}: Props) {
  return (
    <section
      className="relative w-full p-5 pb-6 rounded-3xl border-4 border-panel-stroke bg-green-200 shadow-pixel flex flex-col justify-center"
    >
      <div className="flex justify-between items-center">
        <div className="font-press text-[11px] flex items-center gap-2.5">
          <span>💬</span>
          <span>Chat</span>
        </div>
        <span className="bg-barn text-white font-press text-[9px] px-2 py-1.5 border-[3px] border-panel-stroke shadow-pixel-sm">
          {unread}
        </span>
      </div>
      <p className="font-pixelify text-base text-wood-dark mt-2.5">
        {preview.from}: <span className="text-ink">{preview.text}</span>
      </p>
    </section>
  );
}
