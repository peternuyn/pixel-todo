import type { CSSProperties } from "react";
import type { Sprite } from "./sprites";

type Props = Sprite & {
  /** Size of one pixel cell, in px. */
  pixel?: number;
  className?: string;
  style?: CSSProperties;
};

// Renders a {@link Sprite} (rows of characters + a palette) as a crisp grid of
// coloured cells. This keeps pixel artwork as inline, version-controlled data —
// no extra image requests — and makes each sprite trivially recolourable. Purely
// presentational, so it renders on the server.
export default function PixelSprite({ rows, palette, pixel = 4, className = "", style }: Props) {
  const cols = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${pixel}px)`,
        gridAutoRows: `${pixel}px`,
        imageRendering: "pixelated",
        lineHeight: 0,
        ...style,
      }}
    >
      {rows.flatMap((row, y) =>
        Array.from({ length: cols }, (_, x) => {
          const color = palette[row[x] ?? " "];
          return (
            <span
              key={`${x}-${y}`}
              style={color ? { backgroundColor: color } : undefined}
            />
          );
        })
      )}
    </div>
  );
}
