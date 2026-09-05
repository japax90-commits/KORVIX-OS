import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        korvix: {
          // Identidade Korvix Digital: azul escuro (base institucional) + azul claro (ação/destaque)
          950: "#050B18",
          900: "#0A1530",
          850: "#0E1C3F",
          800: "#122650",
          700: "#1A3568",
          600: "#22468A",
          500: "#2E5CB8",
          400: "#4C86E0", // azul claro primário
          300: "#7FADEF",
          200: "#B7D1F7",
          100: "#E4EDFC",
          50: "#F4F8FE",
        },
        ink: {
          900: "#0B1220",
          700: "#334155",
          500: "#64748B",
          300: "#CBD5E1",
          100: "#F1F5F9",
        },
        success: "#1E9E6B",
        warning: "#C98A1A",
        danger: "#D0483F",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(10, 21, 48, 0.06), 0 8px 24px -12px rgba(10, 21, 48, 0.18)",
      },
      backgroundImage: {
        "korvix-gradient": "linear-gradient(160deg, #0A1530 0%, #122650 45%, #1A3568 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
