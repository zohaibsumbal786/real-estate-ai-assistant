import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans Arabic",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif"
        ]
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        panel: "hsl(var(--panel))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))"
      },
      boxShadow: {
        glow: "0 0 40px rgba(85, 104, 255, 0.24)",
        panel: "0 24px 70px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
