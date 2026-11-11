/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Geist",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        cyber: {
          navy: "#060B16",
          slate: "#0B1221",
          card: "#0F172A",
          border: "#1E293B",
          blue: "#3B82F6",
          cyan: "#06B6D4",
        },
      },
      boxShadow: {
        "cyber-glow": "0 0 24px -4px rgba(6, 182, 212, 0.22)",
        "cyber-blue": "0 0 28px -6px rgba(59, 130, 246, 0.25)",
      },
    },
  },
  plugins: [],
};
