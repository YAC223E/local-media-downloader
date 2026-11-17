/** Semantic tokens: every colour is a CSS variable so the theme toggle repaints instantly. */
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
        faint: "var(--faint)",
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
        infowash: "var(--info-wash)",
      },
      fontFamily: {
        sans: ['"Archivo Variable"', "Archivo", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Azeret Mono Variable"', "Azeret Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        card: "14px",
        field: "10px",
        button: "9px",
        pill: "999px",
      },
      boxShadow: {
        float: "var(--shadow)",
        pop: "var(--shadow-pop)",
      },
    },
  },
  plugins: [],
};
