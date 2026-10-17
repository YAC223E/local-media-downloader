/** Contact Sleeve tokens: every color is a CSS var so the theme toggle repaints instantly. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        hairline: "var(--hairline)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        amber: "var(--amber)",
        amberdeep: "var(--amberdeep)",
        onamber: "var(--on-amber)",
        fixer: "var(--fixer)",
        grease: "var(--grease)",
      },
      fontFamily: {
        ui: ["-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
        mono: ['"Cascadia Mono"', '"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Consolas", '"Liberation Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
