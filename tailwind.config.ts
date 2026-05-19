import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      spacing: {
        "section-y": "var(--site-section-py)",
      },
      boxShadow: {
        "site-card": "var(--shadow-site-card)",
        "site-card-lg": "var(--shadow-site-card-lg)",
        "site-lift": "var(--shadow-site-lift)",
      },
      keyframes: {
        "hero-drift": {
          "0%": { transform: "scale(1.08) translate(0, 0)" },
          "100%": { transform: "scale(1.16) translate(-3%, -2%)" },
        },
      },
      animation: {
        "hero-drift": "hero-drift 28s ease-in-out infinite alternate",
      },
      fontFamily: {
        sans: ["var(--font-lora)", "Georgia", "Cambria", "serif"],
        serif: ["var(--font-playfair)", "Georgia", "Cambria", "serif"],
        "header-nav": [
          "var(--font-header-nav)",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        site: {
          canvas: "var(--site-canvas)",
          "surface-a": "var(--site-surface-a)",
          "surface-b": "var(--site-surface-b)",
          "surface-c": "var(--site-surface-c)",
          card: "var(--site-card)",
          ink: "var(--site-ink)",
          muted: "var(--site-muted)",
          subtle: "var(--site-subtle)",
          line: "var(--site-line)",
          border: "var(--site-border)",
          brand: "rgb(var(--site-brand-rgb) / <alpha-value>)",
          "brand-solid": "var(--site-brand)",
          "brand-hover": "var(--site-brand-hover)",
          "brand-muted": "var(--site-brand-muted)",
          "header-nav-light": "var(--site-header-nav-on-light)",
          "header-nav-hover": "var(--site-header-nav-hover)",
          "header-hero": "rgb(var(--site-header-link-on-hero-rgb) / <alpha-value>)",
          "header-caret": "var(--site-header-link-caret)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
