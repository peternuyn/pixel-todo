// Declarative pixel-art sprites. Each sprite is a little grid: one string per row,
// one character per pixel, mapped to a colour by `palette`. Any character missing
// from the palette (space or ".") is transparent. <PixelSprite> renders these as a
// crisp grid of cells — so artwork lives as readable data, not as image files.

export type Sprite = {
  rows: string[];
  palette: Record<string, string>;
};

// A butter sun with side rays and a top-left highlight.
//   # core   @ highlight   * deeper rays
export const SUN: Sprite = {
  rows: [
    ".....*.....",
    ".....#.....",
    "...#####...",
    "..#@#####..",
    "..#@#####..",
    "*#########*",
    "..#######..",
    "..#######..",
    "...#####...",
    ".....#.....",
    ".....*.....",
  ],
  palette: { "#": "#FFD66B", "@": "#FFE9A8", "*": "#E7AE3A" },
};

// A fluffy pixel cloud with a mint underside shadow.
export const CLOUD: Sprite = {
  rows: [
    "..#####...",
    ".########.",
    "##########",
    ".oooooooo.",
  ],
  palette: { "#": "#FFFFFF", o: "#E6F8EC" },
};

// A four-point twinkle, used for drifting stardust.
export const STAR: Sprite = {
  rows: [
    "..+..",
    "..#..",
    "+#@#+",
    "..#..",
    "..+..",
  ],
  palette: { "#": "#FFFFFF", "@": "#FFF6D8", "+": "#FFD66B" },
};
