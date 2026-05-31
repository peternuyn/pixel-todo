export default function GroundStrip() {
  return (
    <div className="fixed left-0 right-0 bottom-0 h-[60px] z-0 pointer-events-none bg-gradient-to-b from-grass to-grass-dark border-t-4 border-grass-deeper">
      <div className="absolute -top-[10px] left-0 right-0 h-3 grass-tufts-lg" />
    </div>
  );
}
