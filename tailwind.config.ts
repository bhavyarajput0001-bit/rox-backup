/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rox: {
          bright: "#ffaa30",
          mid: "#dd7700",
          hot: "#ffcc66",
          glow: "#ff8800",
          surface: "rgba(12, 6, 0, 0.72)",
          border: "rgba(255, 170, 48, 0.12)",
          "border-active": "rgba(255, 170, 48, 0.35)",
          bg: "#000",
          text: "#f0e6d4",
          muted: "#8a7a6a",
          // legacy aliases used across existing components
          gray: "#8a7a6a",
          amber: "#fbbf24",
          gold: "#f59e0b",
          red: "#ef4444",
          green: "#22c55e",
          blue: "#3b82f6",
          purple: "#8b5cf6",
          // ── Personality / mood accents (from lib/brain/personality.ts) ──
          excited: "#ff9500",
          happy: "#ffd60a",
          focused: "#5e5ce6",
          confused: "#ff9f0a",
          tired: "#8e8e93",
          sass: "#ff375f",
          nerdy: "#32d74b",
          proud: "#ffcc66",
          playful: "#64d2ff",
          empathetic: "#ff453a",
          dramatic: "#bf5af2",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-sm": "0 0 15px rgba(255, 170, 48, 0.15)",
        "glow-md": "0 4px 20px rgba(255, 170, 48, 0.25)",
        "glow-lg": "0 6px 30px rgba(255, 170, 48, 0.4)",
        "glass-card": "0 8px 32px rgba(0, 0, 0, 0.3)",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "glow-line": "glow-line-scan 2s linear infinite",
        "grain-drift": "grain-drift 0.8s steps(2) infinite",
        float: "float-subtle 6s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        "border-glow": "border-glow-scan 3s linear infinite",
        // keep legacy aliases working
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255, 170, 48, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(255, 170, 48, 0.35)" },
        },
        "glow-line-scan": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "grain-drift": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(-1px, 1px)" },
          "50%": { transform: "translate(1px, -1px)" },
          "75%": { transform: "translate(-1px, -1px)" },
        },
        "float-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "border-glow-scan": {
          "0%": { backgroundPosition: "-100% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // keep legacy aliases working
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};