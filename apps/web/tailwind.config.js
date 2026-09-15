/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rox: {
          bg: "#030303",
          deep: "#070604",
          dark: "#0C0804",
          amber: "#FF8A00",
          gold: "#FFB000",
          light: "#FFD166",
          bright: "#FFF2B2",
          text: "#FFF8E7",
          gray: "#9A8C7A",
          dim: "#5A4E40",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(255, 138, 0, 0.3)" },
          "100%": { boxShadow: "0 0 40px rgba(255, 138, 0, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
