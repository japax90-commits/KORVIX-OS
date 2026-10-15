import type { Config } from "tailwindcss";

// Todas as cores vêm de variáveis CSS (app/globals.css), com valores próprios
// para o tema claro e o escuro. As escalas `ink` (neutros) e `korvix` (marca)
// mantêm os nomes já usados no código; os tokens semânticos (`surface`,
// `primary`, estados) cobrem o que não pode simplesmente inverter.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix: string, steps: number[]) => Object.fromEntries(steps.map((s) => [s, v(`${prefix}-${s}`)]));

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        korvix: scale("korvix", [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950]),
        ink: scale("ink", [50, 100, 200, 300, 400, 500, 600, 700, 900]),
        surface: v("surface"),
        canvas: v("canvas"),
        nav: v("nav"),
        primary: { DEFAULT: v("primary"), hover: v("primary-hover"), fg: v("primary-fg") },
        success: v("success"),
        warning: v("warning"),
        danger: v("danger"),
        info: v("info"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        overlay: "var(--shadow-overlay)",
      },
      backgroundImage: {
        "korvix-gradient": "linear-gradient(160deg, #0A1530 0%, #122650 45%, #1A3568 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
