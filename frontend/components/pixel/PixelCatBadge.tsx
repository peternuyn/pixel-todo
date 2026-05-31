const earStyle: React.CSSProperties = {
  width: 0,
  height: 0,
  borderLeft: "6px solid transparent",
  borderRight: "6px solid transparent",
  borderBottom: "10px solid #f4a259",
};

export default function PixelCatBadge() {
  return (
    <div className="relative w-[52px] h-[44px] shrink-0">
      <div className="absolute left-[10px] top-[8px] w-[32px] h-[28px] bg-cat-orange border-[3px] border-panel-stroke" />
      <div className="absolute left-[8px] top-0" style={earStyle} />
      <div className="absolute left-[36px] top-0" style={earStyle} />
      <div className="absolute left-[18px] top-[18px] w-1 h-1.5 bg-ink" />
      <div className="absolute left-[30px] top-[18px] w-1 h-1.5 bg-ink" />
      <div className="absolute left-[24px] top-[26px] w-1 h-[3px] bg-pink-soft" />
    </div>
  );
}
