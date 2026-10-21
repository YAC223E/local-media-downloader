/** Semantic tokens: every color is a CSS variable so the theme toggle repaints instantly. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        accenthover: "var(--accent-hover)",
        onaccent: "var(--on-accent)",
        brand: "var(--brand)",
        focus: "var(--focus)",
        go: "var(--go)",
        stop: "var(--stop)",
        info: "var(--info)",
        accentwash: "var(--accent-wash)",
        gowash: "var(--go-wash)",
        stopwash: "var(--stop-wash)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Aptos",
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"Cascadia Mono"',
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
      },
      borderRadius: {
        card: "18px",
        field: "12px",
        button: "10px",
        pill: "999px",
      },
      boxShadow: {
        float: "var(--shadow)",
      },
    },
  },
  plugins: [],
};
