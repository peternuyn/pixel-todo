import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core theme anchored on #aee7bc (soft mint-leaf)
        // Sky / ambient gradient — light wash → main mint → deeper leaf
        sky: {
          top: "#E6F8EC",
          mid: "#AEE7BC", // ← brand color
          bot: "#8FD6A6",
        },
        // Farm grass — the organic green family, rooted in the brand mint
        grass: {
          light: "#C8F0D2",
          DEFAULT: "#AEE7BC", // ← brand color
          dark: "#6FC68C",
          deeper: "#3F8E5E",
        },
        // "Wood" reframed as mint-toned planks for buttons, fences
        wood: {
          light: "#C2ECCD",
          DEFAULT: "#8FD6A6",
          dark: "#4E9D6C",
        },
        // Warm terracotta pop — streaks, pets, private/alert states
        barn: {
          DEFAULT: "#E8806B",
          dark: "#BE5240",
        },
        // Card surface — pale mint parchment, brand-tinted shadow + stroke
        panel: {
          DEFAULT: "#F1FBF3",
          shadow: "#AEE7BC", // ← brand color
          stroke: "#5FB37C",
        },
        // Sun accents — warm butter for the Pomodoro / harvest highlights
        sun: {
          DEFAULT: "#FFD66B",
          deep: "#E7AE3A",
        },
        // Futuristic aqua-cyan — shader glow, "tech" accents against organic mint
        glow: {
          DEFAULT: "#5FD9C4",
          deep: "#2FB6A0",
        },
        pink: {
          soft: "#ffadc6",
        },
        leaf: "#3F8E5E",
        // Body text — deep forest, reads like mint-tinted ink
        ink: "#173E2B",
        cat: {
          orange: "#f4a259",
          orangeDark: "#c97a35",
          cream: "#ffe2b8",
        },
      },
      fontFamily: {
        press: ["var(--font-press-start)", "monospace"],
        vt: ["var(--font-vt323)", "monospace"],
        pixelify: ["var(--font-pixelify)", "sans-serif"],
        silk: ["var(--font-silkscreen)", "monospace"],
        jersey: ["var(--font-jersey)", "serif"],
      },
      boxShadow: {
        // Hard pixel-style shadows (no blur) — deep forest for strong contrast
        pixel: "4px 4px 0 0 #173E2B",
        "pixel-sm": "2px 2px 0 0 #173E2B",
        "pixel-lg": "6px 6px 0 0 #173E2B",
        "pixel-inset": "inset 0 -6px 0 0 #AEE7BC",
      },
      keyframes: {
        catBob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        tailWag: {
          "0%, 100%": { transform: "rotate(-20deg)" },
          "50%": { transform: "rotate(-40deg)" },
        },
        zzzFloat: {
          "0%": { transform: "translate(0,0)", opacity: "0.9" },
          "100%": { transform: "translate(8px,-16px)", opacity: "0" },
        },
        cloudDrift: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(20px)" },
        },
      },
      animation: {
        catBob: "catBob 2.4s ease-in-out infinite",
        tailWag: "tailWag 1.6s ease-in-out infinite",
        zzzFloat: "zzzFloat 3s ease-in-out infinite",
        cloudDrift: "cloudDrift 8s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
