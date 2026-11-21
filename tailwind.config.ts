import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900: "#070b14", 800: "#0b1220", 700: "#111a2b", 600: "#18243a", 500: "#22314c" },
        line: "#1d2a41",
        fog: { 100: "#e6ecf5", 200: "#c3cfe1", 300: "#94a4bf", 400: "#6b7d99" },
        brand: { 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488" },
        tissue: {
          granulation: "#e2544f",
          slough: "#e0c04a",
          necrosis: "#2f3139",
          purulent: "#b2ce3c",
          gangrene: "#4f7a56",
          epithelial: "#f2aba2",
        },
        risk: { low: "#34d399", mod: "#fbbf24", high: "#f87171" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
