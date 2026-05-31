import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mint-themed sky (cool, calm)
        sky: {
          top: "#EDFBEF",
          mid: "#CFF1DD",
          bot: "#B7E4D0",
        },
        // Farm grass keeps its identity but leans mint-warm
        grass: {
          light: "#B7E8C2",
          DEFAULT: "#7BC894",
          dark: "#4D9B68",
          deeper: "#2F6D44",
        },
        // "Wood" reframed as mint-toned planks for buttons, fences
        wood: {
          light: "#A8E0B8",
          DEFAULT: "#6BBF85",
          dark: "#3F8358",
        },
        // Warm contrast pop (chat badge etc.)
        barn: {
          DEFAULT: "#E26D5C",
          dark: "#B14534",
        },
        // Card surface
        panel: {
          DEFAULT: "#EDFBEF",
          shadow: "#B7E4D0",
          stroke: "#5BAA73",
        },
        // Sun accents — butter-mint
        sun: {
          DEFAULT: "#FFE89A",
          deep: "#E7B84A",
        },
        pink: {
          soft: "#ffadc6",
        },
        leaf: "#4caf50",
        // Body text — dark forest, reads like mint-tinted ink
        ink: "#1C3A26",
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
        // Hard pixel-style shadows (no blur) — dark forest for strong contrast
        pixel: "4px 4px 0 0 #1C3A26",
        "pixel-sm": "2px 2px 0 0 #1C3A26",
        "pixel-lg": "6px 6px 0 0 #1C3A26",
        "pixel-inset": "inset 0 -6px 0 0 #B7E4D0",
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
