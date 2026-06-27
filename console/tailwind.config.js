/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#fbfbfa",
        surface: "#ffffff",
        ink: {
          900: "#1a1a1a",
          700: "#3d3d3d",
          500: "#6b6b6b",
          400: "#8a8a8a",
          300: "#b5b5b5",
        },
        line: {
          DEFAULT: "#e8e8e6",
          strong: "#dcdcd9",
        },
        // Single restrained agent-accent (cool indigo/violet) and human-accent (warm amber)
        agent: {
          50: "#eef0ff",
          100: "#e0e3ff",
          500: "#5b5bd6",
          600: "#4f4fc9",
          700: "#4242a8",
        },
        human: {
          50: "#fdf4e7",
          100: "#fbe9cf",
          500: "#c98a1e",
          600: "#b07814",
          700: "#8a5e0f",
        },
        approve: {
          50: "#eef6ef",
          100: "#dcecde",
          500: "#4f8a5b",
          600: "#427a4d",
        },
        done: {
          50: "#f1f3f4",
          500: "#6b7280",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 17, 17, 0.04), 0 1px 1px rgba(17, 17, 17, 0.03)",
        "card-hover":
          "0 4px 12px rgba(17, 17, 17, 0.06), 0 2px 4px rgba(17, 17, 17, 0.04)",
        panel: "-8px 0 32px rgba(17, 17, 17, 0.06)",
      },
      keyframes: {
        "approve-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(79, 138, 91, 0.0)" },
          "30%": { boxShadow: "0 0 0 4px rgba(79, 138, 91, 0.28)" },
          "100%": { boxShadow: "0 0 0 0 rgba(79, 138, 91, 0.0)" },
        },
        "border-trace": {
          "0%": { borderColor: "rgba(201, 138, 30, 0.5)" },
          "50%": { borderColor: "rgba(201, 138, 30, 1)" },
          "100%": { borderColor: "rgba(201, 138, 30, 0.5)" },
        },
        "draw-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "caret-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "approve-pulse": "approve-pulse 1.6s ease-out",
        "border-trace": "border-trace 2.4s ease-in-out infinite",
        "draw-in": "draw-in 0.4s ease-out both",
        "slide-in": "slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "caret-blink": "caret-blink 1.1s step-end infinite",
      },
    },
  },
  plugins: [],
};
