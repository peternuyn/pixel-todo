// A subtle CRT/scanline wash laid over the page for retro-console flavour. Fixed,
// non-interactive, and below the floating controls. Kept faint so text stays
// perfectly legible. Pure CSS (see `.scanlines` in globals.css).
export default function ScanlineOverlay() {
  return <div aria-hidden className="scanlines pointer-events-none fixed inset-0 z-[55]" />;
}
