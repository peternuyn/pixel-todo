import PixelCatBadge from "./pixel/PixelCatBadge";

export default function Header() {
  return (
    <header className="flex items-end gap-4 mb-5 max-w-[1240px] mx-auto pl-16 w-full">
      <div className="flex items-center gap-3">
        <PixelCatBadge />
        <div>
          <h1 className="font-jersey text-5xl leading-none text-ink [text-shadow:3px_3px_0_#FFE89A]">
            Meowdow Study Farm
          </h1>
          <p className="font-press text-[9px] tracking-widest text-wood-dark mt-1">
            FOCUS · GROW · HARVEST
          </p>
        </div>
      </div>
    </header>
  );
}
