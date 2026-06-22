import CatWalk from "@/assets/cat/cat-walk.gif";
import ChickenWalk from "@/assets/chicken/chicken-walk.gif";
import CowWalk from "@/assets/cow/cow-walk.gif";

// The horizon band: CSS rolling hills + a grass ground, with farm animals
// strolling across it. The walk is a pure-CSS loop (left → right), so the band
// renders entirely on the server. The animals are data-driven — add a row to
// `PARADE` to put another friend on the field.
//
// `delay` is negative so each animal starts part-way through its walk, spreading
// the herd out across the field from the very first frame instead of bunching at
// the left edge.
type Walker = {
  src: string;
  /** Tailwind width class. */
  size: string;
  /** Tailwind bottom offset so feet meet the grass line. */
  bottom: string;
  duration: string;
  delay: string;
};

const PARADE: Walker[] = [
  { src: CowWalk.src, size: "w-24", bottom: "bottom-[2.4rem]", duration: "34s", delay: "-4s" },
  { src: CatWalk.src, size: "w-14", bottom: "bottom-[2.5rem]", duration: "22s", delay: "-15s" },
  { src: ChickenWalk.src, size: "w-10", bottom: "bottom-[2.6rem]", duration: "16s", delay: "-9s" },
];

export default function FarmParade() {
  return (
    <div aria-hidden className="relative w-full h-44 overflow-hidden -mt-4">
      {/* Rolling hills (soft ellipses) for depth — the sky above stays transparent
          so the WebGL aurora still shows through. */}
      <div className="absolute -bottom-20 left-[-6%] w-[58%] h-44 rounded-[50%] bg-grass-dark/70" />
      <div className="absolute -bottom-24 right-[-6%] w-[64%] h-48 rounded-[50%] bg-grass-dark/60" />

      {/* Ground strip + grass tufts along its top edge. */}
      <div className="absolute bottom-0 left-0 w-full h-12 bg-leaf" />
      <div className="absolute bottom-[2.75rem] left-0 w-full h-4 grass-tufts-lg" />

      {/* The parade. */}
      {PARADE.map((w, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={w.src}
          alt=""
          className={`absolute left-0 animate-walk [image-rendering:pixelated] drop-shadow-[2px_3px_0_rgba(23,62,43,0.25)] ${w.size} ${w.bottom}`}
          style={{ animationDuration: w.duration, animationDelay: w.delay }}
        />
      ))}
    </div>
  );
}
