import type { CSSProperties, ReactNode } from "react";

type Props = {
  /** Horizontal drift in px at full pointer deflection. Larger = "closer". */
  depth?: number;
  /** Vertical drift in px; defaults to `depth`. */
  depthY?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

// Consumer half of the parallax system. It reads the `--parallax-x/y` variables
// published by an ancestor <ParallaxScene> and translates by `depth × parallax`
// (the maths lives in the `.parallax-layer` CSS rule). Different depths on sibling
// layers produce the parallax illusion. No hooks → renders on the server, and with
// no scene above it the variables default to 0, so it's a no-op.
export default function ParallaxLayer({ depth = 20, depthY, className = "", style, children }: Props) {
  return (
    <div
      className={`parallax-layer ${className}`}
      style={{
        "--depth-x": `${depth}px`,
        "--depth-y": `${depthY ?? depth}px`,
        ...style,
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
